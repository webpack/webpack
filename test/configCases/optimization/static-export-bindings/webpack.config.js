"use strict";

/** @import { Configuration } from "../../../../" */
/** @import { Compilation } from "../../../../types.d.ts" */
/** @import { Source } from "webpack-sources" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		concatenateModules: false,
		mangleExports: false,
		usedExports: false
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap(
				"test",
				(/** @type {Compilation} */ compilation) => {
					compilation.hooks.afterProcessAssets.tap(
						"test",
						(/** @type {Record<string, Source>} */ assets) => {
							const source = assets["bundle0.js"].source();
							expect(source).toMatchSnapshot();
						}
					);
				}
			);
		}
	]
};
