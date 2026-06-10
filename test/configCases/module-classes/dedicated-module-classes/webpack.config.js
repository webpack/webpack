"use strict";

const AssetModule = require("../../../../lib/asset/AssetModule");
const JavascriptModule = require("../../../../lib/javascript/JavascriptModule");
const JsonModule = require("../../../../lib/json/JsonModule");

/** @type {Map<string, { new (...args: EXPECTED_ANY[]): EXPECTED_ANY }>} */
const expectedClasses = new Map([
	["javascript/auto", JavascriptModule],
	["javascript/dynamic", JavascriptModule],
	["javascript/esm", JavascriptModule],
	["json", JsonModule],
	["asset", AssetModule],
	["asset/inline", AssetModule],
	["asset/resource", AssetModule],
	["asset/source", AssetModule]
]);

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{ test: /\.png$/, type: "asset/resource" },
			{ test: /\.svg$/, type: "asset/inline" },
			{ test: /\.txt$/, type: "asset/source" },
			{ test: /\.md$/, type: "asset" }
		]
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
