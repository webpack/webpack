"use strict";

const { ExternalModule } = require("../../../../");

const PLUGIN_NAME = "AssertExternalSideEffectsPlugin";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	externalsType: "commonjs",
	optimization: {
		minimize: false
	},
	externals: [
		{
			"side-effect-free-ext": {
				external: "side-effect-free-ext",
				sideEffects: false
			},
			// `true` targets the request itself
			"unused-export-ext": { external: true, sideEffects: false },
			"used-ext": { external: { commonjs: "used-ext" }, sideEffects: false },
			"with-side-effects-ext": {
				external: "with-side-effects-ext",
				sideEffects: true
			},
			"default-ext": "default-ext",
			// same target as `twin-ext`, so only `sideEffects` tells the two apart
			"twin-free-ext": { external: "commonjs twin", sideEffects: false },
			"twin-ext": "commonjs twin"
		},
		({ request }, callback) => {
			if (request === "function-form-ext") {
				return callback(null, { external: request, sideEffects: false });
			}
			callback();
		}
	],
	plugins: [
		/**
		 * @param {import("../../../../").Compiler} compiler compiler
		 */
		(compiler) => {
			compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
				compilation.hooks.afterSeal.tapPromise(PLUGIN_NAME, async () => {
					for (const module of compilation.modules) {
						if (!(module instanceof ExternalModule)) continue;
						// the options form is unwrapped, it never reaches the request
						const request = module.request;
						if (
							typeof request === "object" &&
							!Array.isArray(request) &&
							("external" in request || "sideEffects" in request)
						) {
							throw new Error(
								`the options form leaked into the request ${JSON.stringify(
									request
								)}`
							);
						}
					}
				});
			});
		}
	]
};
