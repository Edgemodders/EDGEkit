/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Edgemodders. Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

// EDGEkit: installs the extensions in product.json's edgekitFirstRunExtensions from the gallery (Open VSX)
// on EDGEkit's first start, for extensions whose licenses do not let EDGEkit ship their files, such as
// Claude Code (design, "Bundled extensions"). Each is installed once: one the modder uninstalls stays
// uninstalled. Offline, it tries again at the next start. Then, once Claude Code is there, it asks once
// whether to set up EDGEchat, the EDGE plugin for Claude Code, through Claude Code's own install dialog (product.json edgekitClaudePlugin; design,
// "Claude Code for EDGE"). tools/brand.mjs copies this file in and tools/patch-upstream.mjs imports it
// from extensions.contribution.ts.

import { timeout } from '../../../../base/common/async.js';
import { Event } from '../../../../base/common/event.js';
import { parse, ParseError } from '../../../../base/common/json.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { env } from '../../../../base/common/process.js';
import { joinPath } from '../../../../base/common/resources.js';
import { isObject } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IExtensionGalleryService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ProgressLocation } from '../../../../platform/progress/common/progress.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { IURLService } from '../../../../platform/url/common/url.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { IOnboardingService } from '../../welcomeOnboarding/common/onboardingService.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';

/** product.json's edgekitClaudePlugin: the Claude Code extension, the plugin and the marketplace it comes from, and the plugin's setup command. */
interface ClaudePlugin {
	readonly extension: string;
	readonly marketplace: string;
	readonly repo: string;
	readonly plugin: string;
	readonly setup: string;
}

const SET_UP_CLAUDE_PLUGIN = 'edgekit.setUpClaudeCode';
const CLAUDE_PLUGIN_ASKED = 'edgekit.claudePlugin.asked';

class EdgekitFirstRunContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.edgekitFirstRun';

	constructor(
		@IProductService productService: IProductService,
		@IExtensionGalleryService private readonly galleryService: IExtensionGalleryService,
		@IExtensionsWorkbenchService private readonly extensionsService: IExtensionsWorkbenchService,
		@IStorageService private readonly storageService: IStorageService,
		@INotificationService private readonly notificationService: INotificationService,
		@ICommandService private readonly commandService: ICommandService,
		@IFileService private readonly fileService: IFileService,
		@IPathService private readonly pathService: IPathService,
		@ILogService private readonly logService: ILogService,
		@IOnboardingService private readonly onboardingService: IOnboardingService,
	) {
		super();
		const product = productService as { edgekitFirstRunExtensions?: string[]; edgekitClaudePlugin?: ClaudePlugin };
		this.start(product.edgekitFirstRunExtensions ?? [], product.edgekitClaudePlugin);
	}

	private async start(ids: string[], plugin: ClaudePlugin | undefined): Promise<void> {
		// Waits for the onboarding to close: Claude Code's trust questions opened behind it and held the
		// keyboard focus, so Escape cancelled the install (found 2026-10-23). The startup page shows the
		// onboarding before this contribution runs (WorkbenchPhase.AfterRestored, then Eventually).
		if ((this.onboardingService as { isShowing?: boolean }).isShowing) {
			await Event.toPromise(this.onboardingService.onDidDismiss);
		}
		if (ids.length && this.galleryService.isEnabled()) {
			await this.installOnce(ids);
		}
		if (plugin) {
			await this.offerClaudePlugin(plugin);
		}
	}

	private async installOnce(ids: string[]): Promise<void> {
		for (const id of ids) {
			const key = `edgekit.firstRun.installed.${id.toLowerCase()}`;
			if (this.storageService.getBoolean(key, StorageScope.APPLICATION, false)) {
				continue;
			}
			const local = await this.extensionsService.queryLocal();
			if (!local.some(e => areSameExtensions(e.identifier, { id }))) {
				try {
					const extension = await this.extensionsService.install(id, undefined, ProgressLocation.Window);
					this.logService.info(`EDGEkit first run: installed ${id} ${extension.version}`);
					this.notificationService.info(localize('edgekit.firstRun.installed', "EDGEkit installed {0} for you, from Open VSX. You can remove it in the Extensions view.", extension.displayName));
				} catch (error) {
					this.logService.warn(`EDGEkit first run: could not install ${id}; trying again at the next start`, error);
					continue;
				}
			}
			this.storageService.store(key, true, StorageScope.APPLICATION, StorageTarget.MACHINE);
		}
	}

	// Asks once, when Claude Code is installed and EDGEchat is not: the plugin adds a third-party
	// plugin and its MCP servers to the modder's Claude Code. Any answer, or closing the question,
	// counts as asked; the command stays in the Command Palette and on the Welcome page.
	private async offerClaudePlugin(plugin: ClaudePlugin): Promise<void> {
		if (this.storageService.getBoolean(CLAUDE_PLUGIN_ASKED, StorageScope.APPLICATION, false)) {
			return;
		}
		const local = await this.extensionsService.queryLocal();
		if (!local.some(e => areSameExtensions(e.identifier, { id: plugin.extension }))) {
			return;
		}
		const asked = () => this.storageService.store(CLAUDE_PLUGIN_ASKED, true, StorageScope.APPLICATION, StorageTarget.MACHINE);
		const configDir = await claudeConfigDir(this.pathService);
		if (await isPluginInstalled(this.fileService, configDir, plugin) || await isPluginTurnedOff(this.fileService, configDir, plugin)) {
			// Set up already, or turned off by the modder: nothing to ask.
			asked();
			return;
		}
		this.notificationService.prompt(Severity.Info,
			localize('edgekit.claudePlugin.ask', "Set up Claude Code for EDGE? Claude Code shows you EDGEchat, the Edgemodders plugin for Claude Code, to install: Cyberpunk 2077 modding skills and the EDGE tools' MCP servers, from github.com/{0}.", plugin.repo),
			[
				{ label: localize('edgekit.claudePlugin.setUp', "Set Up"), run: () => { asked(); this.commandService.executeCommand(SET_UP_CLAUDE_PLUGIN); } },
				{ label: localize('edgekit.claudePlugin.no', "No, Thanks"), run: asked },
			],
			{ sticky: true, onCancel: asked });
	}
}

registerWorkbenchContribution2(EdgekitFirstRunContribution.ID, EdgekitFirstRunContribution, WorkbenchPhase.Eventually);

function pluginKey(plugin: ClaudePlugin): string {
	return `${plugin.plugin}@${plugin.marketplace}`;
}

// Claude Code's folder: %CLAUDE_CONFIG_DIR% when that is set, else ~/.claude.
async function claudeConfigDir(pathService: IPathService): Promise<URI> {
	return env['CLAUDE_CONFIG_DIR'] ? URI.file(env['CLAUDE_CONFIG_DIR']) : joinPath(await pathService.userHome(), '.claude');
}

async function readJson(fileService: IFileService, file: URI): Promise<Record<string, unknown> | undefined> {
	try {
		const errors: ParseError[] = [];
		const value = parse((await fileService.readFile(file)).value.toString(), errors);
		return isObject(value) ? value as Record<string, unknown> : undefined;
	} catch {
		return undefined;
	}
}

// Claude Code records installed plugins in plugins/installed_plugins.json ({ plugins: { "edge@edgemodders": [...] } },
// read in Claude Code 2.1.310; the file is Claude Code's own, so this may change). enabledPlugins in settings.json
// does not install a plugin: it turns on one that is installed (Claude Code's docs, "Choose an install scope";
// found in the 1.140.2 test, 2026-10-26, when EDGEkit wrote it and Claude Code installed nothing).
async function isPluginInstalled(fileService: IFileService, configDir: URI, plugin: ClaudePlugin): Promise<boolean> {
	const installed = await readJson(fileService, joinPath(configDir, 'plugins', 'installed_plugins.json'));
	const plugins = installed?.['plugins'];
	return isObject(plugins) && Array.isArray((plugins as Record<string, unknown>)[pluginKey(plugin)]) && ((plugins as Record<string, unknown[]>)[pluginKey(plugin)]).length > 0;
}

async function isPluginTurnedOff(fileService: IFileService, configDir: URI, plugin: ClaudePlugin): Promise<boolean> {
	const enabled = (await readJson(fileService, joinPath(configDir, 'settings.json')))?.['enabledPlugins'];
	return isObject(enabled) && (enabled as Record<string, unknown>)[pluginKey(plugin)] === false;
}

// Claude Code installs the plugin itself: EDGEkit opens Claude Code's own install link, which shows its plugin
// dialog on EDGEchat (adding the marketplace after the modder confirms it; the modder picks the scope and installs).
// Once the plugin is installed, EDGEkit opens a new Claude Code session, which loads it, with the plugin's setup
// command in the prompt box. Both links are Claude Code's URI handler (/install-plugin and /open, read in its
// 2.1.310 extension); EDGEkit opens them as trusted, since the modder chose Set Up in EDGEkit.
async function setUpClaudePlugin(accessor: ServicesAccessor): Promise<void> {
	const urlService = accessor.get(IURLService);
	const fileService = accessor.get(IFileService);
	const pathService = accessor.get(IPathService);
	const notificationService = accessor.get(INotificationService);
	const clipboardService = accessor.get(IClipboardService);
	const logService = accessor.get(ILogService);
	const productService = accessor.get(IProductService);
	const plugin = (productService as { edgekitClaudePlugin?: ClaudePlugin }).edgekitClaudePlugin;
	if (!plugin || !productService.urlProtocol) {
		return;
	}
	const link = (path: string, query: string) => URI.from({ scheme: productService.urlProtocol, authority: plugin.extension, path, query });
	const openSetup = () => urlService.open(link('/open', `prompt=${plugin.setup}`), { trusted: true });
	const configDir = await claudeConfigDir(pathService);

	if (await isPluginInstalled(fileService, configDir, plugin)) {
		await openSetup();
		notificationService.info(localize('edgekit.claudePlugin.already', "EDGEchat is installed in Claude Code. Claude Code opened a new session with {0} in its prompt box: press Enter to check the EDGE tools.", plugin.setup));
		return;
	}
	if (!await urlService.open(link('/install-plugin', `plugin=${plugin.plugin}&marketplace=${plugin.repo}`), { trusted: true })) {
		const commands = `/plugin marketplace add ${plugin.repo}\n/plugin install ${pluginKey(plugin)}`;
		logService.warn(`EDGEkit: Claude Code did not take its plugin install link`);
		notificationService.prompt(Severity.Warning,
			localize('edgekit.claudePlugin.fallback', "Claude Code did not open its plugin dialog. Set up the plugin in Claude Code's chat instead, with these two commands: /plugin marketplace add {0}, then /plugin install {1}.", plugin.repo, pluginKey(plugin)),
			[{ label: localize('edgekit.claudePlugin.copy', "Copy the Commands"), run: () => clipboardService.writeText(commands) }],
			{ sticky: true });
		return;
	}
	logService.info(`EDGEkit: opened Claude Code's install dialog for ${pluginKey(plugin)}`);
	for (const end = Date.now() + 10 * 60 * 1000; Date.now() < end;) {
		await timeout(2000);
		if (await isPluginInstalled(fileService, configDir, plugin)) {
			logService.info(`EDGEkit: ${pluginKey(plugin)} is installed; opening a Claude Code session with ${plugin.setup}`);
			await openSetup();
			notificationService.info(localize('edgekit.claudePlugin.done', "EDGEchat is installed. Claude Code opened a new session with {0} in its prompt box: press Enter to check the EDGE tools.", plugin.setup));
			return;
		}
	}
	logService.info(`EDGEkit: ${pluginKey(plugin)} was not installed within 10 minutes`);
}

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: SET_UP_CLAUDE_PLUGIN,
			title: localize2('edgekit.claudePlugin.command', "Set Up Claude Code for EDGE"),
			category: localize2('edgekit.category', "EDGEkit"),
			f1: true,
		});
	}
	run(accessor: ServicesAccessor): Promise<void> {
		return setUpClaudePlugin(accessor);
	}
});
