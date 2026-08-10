"use strict";

const webpack = require("../../../../");

const { ExternalModule } = webpack;

const PLUGIN_NAME = "AssertExternalInteropIdentityPlugin";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		libraryTarget: "amd"
	},
	module: {
		rules: [{ test: /index\.js$/, type: "javascript/esm" }]
	},
	// Both externals resolve to the same AMD target, so only `interop` tells the
	// two modules apart — it has to reach the identifier and the module hash.
	externals: {
		"esm-ext": { amd: "shared-ext", interop: "esModule" },
		"cjs-ext": { amd: "shared-ext", interop: "default" },
		"plain-ext": "shared-ext"
	},
	plugins: [
		new webpack.BannerPlugin({
			raw: true,
			banner:
				"function define(deps, fn) { fn(...deps.map(dep => require(dep))); }\n"
		}),
		/**
		 * @param {import("../../../../").Compiler} compiler compiler
		 */
		(compiler) => {
			compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
				compilation.hooks.afterSeal.tapPromise(PLUGIN_NAME, async () => {
					const { chunkGraph } = compilation;
					const externals = [...compilation.modules].filter(
						(module) => module instanceof ExternalModule
					);
					if (externals.length !== 3) {
						throw new Error(`expected 3 externals, got ${externals.length}`);
					}
					// by interop, not by position: the hash check must compare the two
					// interop variants rather than whichever two come first
					/**
					 * @param {string} interop interop kind
					 * @returns {import("../../../../").Module} the external declaring it
					 */
					const withInterop = (interop) => {
						const found = externals.find(
							(module) => module.interop === interop
						);
						if (!found) throw new Error(`no external with ${interop} interop`);
						return found;
					};
					for (const module of externals) {
						const identifier = module.identifier();
						if (module.interop === undefined) {
							if (identifier.includes("interop")) {
								throw new Error(`unexpected interop in ${identifier}`);
							}
							continue;
						}
						// `interop` is a reserved key on the object form, not a target
						const request = module.request;
						if (
							typeof request !== "object" ||
							Array.isArray(request) ||
							"interop" in request
						) {
							throw new Error(
								`interop leaked into the request ${JSON.stringify(request)}`
							);
						}
						if (!identifier.includes(`|interop=${module.interop}`)) {
							throw new Error(`interop missing from ${identifier}`);
						}
					}
					const hashOf = (
						/** @type {import("../../../../").Module} */ module
					) =>
						chunkGraph.getModuleHash(
							module,
							[...chunkGraph.getModuleChunks(module)][0].runtime
						);
					if (
						hashOf(withInterop("esModule")) === hashOf(withInterop("default"))
					) {
						throw new Error("interop must contribute to the module hash");
					}
				});
			});
		}
	]
};
