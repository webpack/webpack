"use strict";

const CssModule = require("../../../../lib/css/CssModule");
const HtmlModule = require("../../../../lib/html/HtmlModule");

/** @type {Map<string, { new (...args: EXPECTED_ANY[]): EXPECTED_ANY }>} */
const expectedClasses = new Map([
	["css", CssModule],
	["css/auto", CssModule],
	["css/global", CssModule],
	["css/module", CssModule],
	["html", HtmlModule]
]);

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	experiments: {
		css: true,
		html: true
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("Test", (compilation) => {
				compilation.hooks.finishModules.tap("Test", (modules) => {
					for (const module of modules) {
						const ExpectedClass = expectedClasses.get(module.type);
						if (ExpectedClass && !(module instanceof ExpectedClass)) {
							throw new Error(
								`${module.identifier()} (${module.type}) is not an instance of ${ExpectedClass.name}`
							);
						}
					}
				});
			});
		}
	]
};
