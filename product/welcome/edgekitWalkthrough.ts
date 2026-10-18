/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Edgemodders. Licensed under the MIT License.
 *  EDGEkit's own Welcome page walkthrough. tools/brand.mjs copies this file into the Code - OSS
 *  checkout (src/vs/workbench/contrib/welcomeGettingStarted/common/edgekitWalkthrough.ts) and
 *  tools/patch-upstream.mjs lists it first among the walkthroughs, above upstream's.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import type { BuiltinGettingStartedCategory } from './gettingStartedContent.js';

const edgekitIcon = registerIcon('getting-started-edgekit', Codicon.zap, localize('edgekit.walkthrough.icon', "Icon used for EDGEkit's setup walkthrough on the Welcome page"));

const Button = (title: string, href: string) => `[${title}](${href})`;

export const edgekitWalkthrough: BuiltinGettingStartedCategory = {
	id: 'EDGEkitSetup',
	title: localize('edgekit.walkthrough.title', "Get started with EDGEkit"),
	description: localize('edgekit.walkthrough.description', "Set up EDGEkit for Cyberpunk 2077 modding"),
	isFeatured: true,
	icon: edgekitIcon,
	when: '!isWeb',
	walkthroughPageTitle: localize('edgekit.walkthrough.pageTitle', "EDGEkit setup"),
	next: 'Beginner',
	content: {
		type: 'steps',
		steps: [
			{
				id: 'edgekitSignIn',
				title: localize('edgekit.walkthrough.signIn.title', "Sign in with GitHub"),
				description: localize('edgekit.walkthrough.signIn.description', "A GitHub account is how you publish your mods on EDGEmods, the Edgemodders mod site, and how you clone and share mod repositories.\n{0}", Button(localize('edgekit.walkthrough.signIn.button', "Sign in with GitHub"), 'command:workbench.actions.accounts.signIn')),
				completionEvents: ['onContext:defaultAccountStatus == available'],
				media: { type: 'svg', altText: 'A GitHub account linked to EDGEmods.', path: 'edgekit-signin.svg' },
			},
			{
				id: 'edgekitTools',
				title: localize('edgekit.walkthrough.tools.title', "Install the EDGE tools"),
				description: localize('edgekit.walkthrough.tools.description', "The EDGEkit pack installs the EDGE extensions from Open VSX: REDcode, a modding workspace for the game's files, and EDGEdeck, a simple mod manager. New EDGE tools join the pack as they come out.\n{0}\n{1}", Button(localize('edgekit.walkthrough.tools.button', "Install the EDGEkit Pack"), 'command:workbench.extensions.installExtension?%5B%22edgemodders.edgekit%22%5D'), Button(localize('edgekit.walkthrough.tools.browse', "Browse EDGE Extensions"), 'command:workbench.extensions.search?%22edgemodders%22')),
				completionEvents: ['extensionInstalled:edgemodders.edgekit'],
				media: { type: 'svg', altText: 'The EDGE extensions in the Extensions view.', path: 'edgekit-tools.svg' },
			},
			{
				id: 'edgekitGameFolder',
				title: localize('edgekit.walkthrough.game.title', "Point REDcode at the game"),
				description: localize('edgekit.walkthrough.game.description', "REDcode needs to know where Cyberpunk 2077 is installed, to read the game's files and to install your mods. Set it once; REDcode keeps it.\n{0}", Button(localize('edgekit.walkthrough.game.button', "Set Game Folder"), 'command:redcode.setGameFolder')),
				completionEvents: ['onCommand:redcode.setGameFolder'],
				media: { type: 'svg', altText: 'The Cyberpunk 2077 folder chosen for REDcode.', path: 'edgekit-game.svg' },
			},
			{
				id: 'edgekitTheme',
				title: localize('edgekit.walkthrough.theme.title', "The REDnode HUD theme"),
				description: localize('edgekit.walkthrough.theme.description', "EDGEkit starts in REDnode HUD, a dark theme in the colours of the game's interface. You can pick another one at any time.\n{0}", Button(localize('edgekit.walkthrough.theme.button', "Browse Color Themes"), 'command:workbench.action.selectTheme')),
				completionEvents: ['onSettingChanged:workbench.colorTheme', 'onCommand:workbench.action.selectTheme'],
				media: { type: 'svg', altText: 'Code in the REDnode HUD theme.', path: 'edgekit-theme.svg' },
			},
			{
				id: 'edgekitOpenMod',
				title: localize('edgekit.walkthrough.openMod.title', "Open a mod"),
				description: localize('edgekit.walkthrough.openMod.description', "Open the folder of a mod you are working on, or clone one from GitHub.\n{0}\n{1}", Button(localize('edgekit.walkthrough.openMod.open', "Open Folder"), 'command:workbench.action.files.openFolder'), Button(localize('edgekit.walkthrough.openMod.clone', "Clone Repository"), 'command:git.clone')),
				completionEvents: ['onCommand:workbench.action.files.openFolder', 'onCommand:git.clone'],
				media: { type: 'svg', altText: 'A mod folder in the Explorer.', path: 'edgekit-mod.svg' },
			},
			{
				id: 'edgekitLearn',
				title: localize('edgekit.walkthrough.learn.title', "Learn more"),
				description: localize('edgekit.walkthrough.learn.description', "The EDGEkit docs say what is in it, how it is built and what comes next. The Edgemodders site has the other EDGE tools.\n{0}\n{1}", Button(localize('edgekit.walkthrough.learn.docs', "EDGEkit Docs"), 'https://edgemodders.github.io/EDGEkit/'), Button(localize('edgekit.walkthrough.learn.site', "Edgemodders"), 'https://edgemodders.ai/')),
				completionEvents: ['onLink:https://edgemodders.github.io/EDGEkit/', 'onLink:https://edgemodders.ai/'],
				media: { type: 'svg', altText: 'The EDGEkit docs.', path: 'edgekit-learn.svg' },
			},
		]
	},
};
