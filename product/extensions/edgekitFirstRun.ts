/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Edgemodders. Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

// EDGEkit: installs the extensions in product.json's edgekitFirstRunExtensions from the gallery (Open VSX)
// on EDGEkit's first start, for extensions whose licenses do not let EDGEkit ship their files, such as
// Claude Code (design, "Bundled extensions"). Each is installed once: one the modder uninstalls stays
// uninstalled. Offline, it tries again at the next start. Then, once Claude Code is there, it asks once
// whether to set up EDGEchat, the EDGE plugin for Claude Code (product.json edgekitClaudePlugin; design,
// "Claude Code for EDGE"). tools/brand.mjs copies this file in and tools/patch-upstream.mjs imports it
// from extensions.contribution.ts.

import { VSBuffer } from '../../../../base/common/buffer.js';
import { Event } from '../../../../base/common/event.js';
import { parse, ParseError } from '../../../../base/common/json.js';
import { applyEdits, setProperty } from '../../../../base/common/jsonEdit.js';
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
import { FileOperationResult, IFileService, toFileOperationResult } from '../../../../platform/files/common/files.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ProgressLocation } from '../../../../platform/progress/common/progress.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { IOnboardingService } from '../../welcomeOnboarding/common/onboardingService.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';

/** product.json's edgekitClaudePlugin: the Claude Code extension, and the plugin and the marketplace it comes from. */
interface ClaudePlugin {
	readonly extension: string;
	readonly marketplace: string;
	readonly repo: string;
	readonly plugin: string;
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

	// Asks once, when Claude Code is installed, as for Claude Code's own install: the plugin adds a
	// third-party plugin and its MCP servers to the modder's Claude Code. Any answer, or closing the
	// question, counts as asked; the command stays in the Command Palette and on the Welcome page.
	private async offerClaudePlugin(plugin: ClaudePlugin): Promise<void> {
		if (this.storageService.getBoolean(CLAUDE_PLUGIN_ASKED, StorageScope.APPLICATION, false)) {
			return;
		}
		const local = await this.extensionsService.queryLocal();
		if (!local.some(e => areSameExtensions(e.identifier, { id: plugin.extension }))) {
			return;
		}
		const asked = () => this.storageService.store(CLAUDE_PLUGIN_ASKED, true, StorageScope.APPLICATION, StorageTarget.MACHINE);
		const settings = await readClaudeSettings(this.fileService, this.pathService);
		if (settings.value?.enabledPlugins?.[pluginKey(plugin)] !== undefined) {
			// Set up already, or turned off by the modder: nothing to ask.
			asked();
			return;
		}
		this.notificationService.prompt(Severity.Info,
			localize('edgekit.claudePlugin.ask', "Set up Claude Code for EDGE? EDGEkit adds EDGEchat, the Edgemodders plugin for Claude Code, to your Claude Code settings: Cyberpunk 2077 modding skills and the EDGE tools' MCP servers, from github.com/{0}.", plugin.repo),
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

interface ClaudeSettings {
	readonly file: URI;
	readonly text: string;
	/** The parsed settings, or undefined when the file is not a strict JSON object or cannot be read. */
	readonly value: { extraKnownMarketplaces?: Record<string, unknown>; enabledPlugins?: Record<string, unknown> } | undefined;
	readonly problem?: string;
}

// Claude Code's user settings: %CLAUDE_CONFIG_DIR%\settings.json when that is set, else ~/.claude/settings.json.
// They are strict JSON (no comments, no trailing commas), and Claude Code and other tools write to them.
async function readClaudeSettings(fileService: IFileService, pathService: IPathService): Promise<ClaudeSettings> {
	const configDir = env['CLAUDE_CONFIG_DIR'] ? URI.file(env['CLAUDE_CONFIG_DIR']) : joinPath(await pathService.userHome(), '.claude');
	const file = joinPath(configDir, 'settings.json');
	let text: string;
	try {
		text = (await fileService.readFile(file)).value.toString();
	} catch (error) {
		if (toFileOperationResult(error) === FileOperationResult.FILE_NOT_FOUND) {
			return { file, text: '{}', value: {} };
		}
		return { file, text: '', value: undefined, problem: String(error) };
	}
	if (!text.trim()) {
		return { file, text: '{}', value: {} };
	}
	const errors: ParseError[] = [];
	const value = parse(text, errors, { disallowComments: true, allowTrailingComma: false });
	if (errors.length || !isObject(value)) {
		return { file, text, value: undefined, problem: localize('edgekit.claudePlugin.notJson', "it is not plain JSON") };
	}
	return { file, text, value: value as ClaudeSettings['value'] };
}

// Adds the marketplace and turns the plugin on, keeping every other key and the file's layout.
// A marketplace of that name already declared (a modder's own checkout, say) is kept as it is.
// Claude Code then fetches the plugin at its next session start (its plugin loading docs, read
// 2026-10-23; they do not say another program may write these settings, so EDGEkit tests it).
async function setUpClaudePlugin(accessor: ServicesAccessor): Promise<void> {
	const fileService = accessor.get(IFileService);
	const pathService = accessor.get(IPathService);
	const notificationService = accessor.get(INotificationService);
	const clipboardService = accessor.get(IClipboardService);
	const logService = accessor.get(ILogService);
	const plugin = (accessor.get(IProductService) as { edgekitClaudePlugin?: ClaudePlugin }).edgekitClaudePlugin;
	if (!plugin) {
		return;
	}
	const commands = `/plugin marketplace add ${plugin.repo}\n/plugin install ${pluginKey(plugin)}`;
	const fallback = (file: URI, problem: string) => {
		logService.warn(`EDGEkit: did not change ${file.fsPath}: ${problem}`);
		notificationService.prompt(Severity.Warning,
			localize('edgekit.claudePlugin.fallback', "EDGEkit did not change {0}: {1}. Set up the plugin in Claude Code's chat instead, with these two commands: /plugin marketplace add {2}, then /plugin install {3}.", file.fsPath, problem, plugin.repo, pluginKey(plugin)),
			[{ label: localize('edgekit.claudePlugin.copy', "Copy the Commands"), run: () => clipboardService.writeText(commands) }],
			{ sticky: true });
	};

	const settings = await readClaudeSettings(fileService, pathService);
	if (!settings.value) {
		fallback(settings.file, settings.problem ?? '');
		return;
	}
	let text = settings.text;
	try {
		const formatting = { tabSize: 2, insertSpaces: true, eol: text.includes('\r\n') ? '\r\n' : '\n' };
		if (settings.value.extraKnownMarketplaces?.[plugin.marketplace] === undefined) {
			text = applyEdits(text, setProperty(text, ['extraKnownMarketplaces', plugin.marketplace], { source: { source: 'github', repo: plugin.repo } }, formatting));
		}
		if (settings.value.enabledPlugins?.[pluginKey(plugin)] !== true) {
			text = applyEdits(text, setProperty(text, ['enabledPlugins', pluginKey(plugin)], true, formatting));
		}
		if (text !== settings.text) {
			await fileService.writeFile(settings.file, VSBuffer.fromString(text));
			logService.info(`EDGEkit: added ${pluginKey(plugin)} to ${settings.file.fsPath}`);
		}
	} catch (error) {
		fallback(settings.file, String(error));
		return;
	}
	notificationService.info(localize('edgekit.claudePlugin.done', "Claude Code is set up for EDGE. Its next session fetches the plugin: when it says \"Plugins changed\", run /reload-plugins, then /edge:setup."));
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
