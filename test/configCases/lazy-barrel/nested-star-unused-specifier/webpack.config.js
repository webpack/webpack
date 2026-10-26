"use strict";

const createLazyBarrelTest = require("../_helpers/createLazyBarrelTest");

module.exports = createLazyBarrelTest(
	["ui/theme/fonts.js", "ui/theme/spacing.js", "ui/theme/default-theme.js"],
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
