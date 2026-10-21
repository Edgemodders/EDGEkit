/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Edgemodders. Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

// EDGEkit: installs the extensions in product.json's edgekitFirstRunExtensions from the gallery (Open VSX)
// on EDGEkit's first start, for extensions whose licenses do not let EDGEkit ship their files, such as
// Claude Code (design, "Bundled extensions"). Each is installed once: one the modder uninstalls stays
// uninstalled. Offline, it tries again at the next start. tools/brand.mjs copies this file in and
// tools/patch-upstream.mjs imports it from extensions.contribution.ts.

import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IExtensionGalleryService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ProgressLocation } from '../../../../platform/progress/common/progress.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';

class EdgekitFirstRunContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.edgekitFirstRun';

	constructor(
		@IProductService productService: IProductService,
		@IExtensionGalleryService private readonly galleryService: IExtensionGalleryService,
		@IExtensionsWorkbenchService private readonly extensionsService: IExtensionsWorkbenchService,
		@IStorageService private readonly storageService: IStorageService,
		@INotificationService private readonly notificationService: INotificationService,
		@ILogService private readonly logService: ILogService,
	) {
		super();
		const ids = (productService as { edgekitFirstRunExtensions?: string[] }).edgekitFirstRunExtensions ?? [];
		if (ids.length && this.galleryService.isEnabled()) {
			this.installOnce(ids);
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
}

registerWorkbenchContribution2(EdgekitFirstRunContribution.ID, EdgekitFirstRunContribution, WorkbenchPhase.Eventually);
