"use strict";

const acorn = require("acorn");
const webpack = require("../../../../");

/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../").Configuration} Configuration */

/**
 * Fails the build when an emitted script does not parse as ES5, or a module
 * holds a string literal with a raw U+2028 or U+2029: before ES2019 both end
 * a string literal.
 * @param {Compiler} compiler compiler
 */
const parsesBeforeES2019 = (compiler) => {
	compiler.hooks.compilation.tap("test", (compilation) => {
		compilation.hooks.processAssets.tap(
			{
				name: "test",
				stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT
			},
			(assets) => {
				for (const name of Object.keys(assets)) {
					const isModule = name.endsWith(".mjs");
					if (!isModule && !name.endsWith(".js")) continue;
					const source = assets[name].source().toString();
					try {
						if (isModule) {
							for (const token of acorn.tokenizer(source, {
								ecmaVersion: "latest",
								sourceType: "module"
							})) {
								if (
									token.type === acorn.tokTypes.string &&
									/[\u2028\u2029]/.test(source.slice(token.start, token.end))
								) {
									throw new Error(`raw line separator at ${token.start}`);
								}
							}
						} else {
							acorn.parse(source, { ecmaVersion: 5 });
						}
					} catch (err) {
						compilation.errors.push(
							new compiler.webpack.WebpackError(
								`${JSON.stringify(name)} does not parse: ${/** @type {Error} */ (err).message}`
							)
						);
					}
				}
			}
		);
	});
};

const environment = {
	arrowFunction: false,
	const: false,
	destructuring: false,
	forOf: false,
	methodShorthand: false,
	optionalChaining: false,
	templateLiteral: false
};

/**
 * @param {Configuration} config config
 * @returns {Configuration} config with the shared options
 */
const withDefaults = (config) => ({
	mode: "development",
	devtool: false,
	entry: { "main\u2029entry": "./index.js" },
	...config,
	output: { environment, ...config.output },
	optimization: { chunkIds: "named" },
	plugins: [parsesBeforeES2019, ...(config.plugins || [])]
});

/** @type {Configuration[]} */
module.exports = [
	withDefaults({ target: "web" }),
	withDefaults({
		target: "web",
		output: { chunkFilename: "[name].[contenthash].js" }
	}),
	withDefaults({
		target: "web",
		plugins: [new webpack.HotModuleReplacementPlugin()]
	}),
	withDefaults({ target: "node" }),
	withDefaults({ target: "webworker" }),
	withDefaults({ target: "node", output: { module: true } })
];
