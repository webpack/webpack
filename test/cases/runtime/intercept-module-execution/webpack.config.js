/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Nihal Shinde @NihalShinde4933
*/

"use strict";

const { RuntimeGlobals } = require("../../../../lib/index");

/** @type {import("../../../../lib/index").Configuration} */
module.exports = {
	mode: "development",
	output: {
		pathinfo: true
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("TestPlugin", (compilation) => {
					compilation.hooks.additionalTreeRuntimeRequirements.tap(
						"TestPlugin",
						(chunk, set) => {
							set.add(RuntimeGlobals.interceptModuleExecution);
						}
					);

					compilation.mainTemplate.hooks.requireExtensions.tap(
						"TestPlugin",
						(source) =>
							`${source}
__webpack_require__.i.push(function(options) {
	if (options.factory === undefined) {
		options.factory = function(module, exports, require) {
			module.exports = "recovered-success";
		};
	}
});
`
					);
				});
			}
		}
	]
};
