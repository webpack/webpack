"use strict";

const createLazyMakeTest = require("../_helpers/createLazyMakeTest");

module.exports = createLazyMakeTest(
	[
		"ui/theme/fonts.js",
		"ui/theme/spacing.js",
		"ui/theme/default-theme.js",
		"kit/theme/more.js",
		"lib/foo.js",
		"lib/other.js"
	],
	{
		mode: "production",
		module: { strictExportPresence: true },
		optimization: {
			sideEffects: true,
			providedExports: true,
			usedExports: true,
			minimize: false,
			concatenateModules: false
		}
	}
);
