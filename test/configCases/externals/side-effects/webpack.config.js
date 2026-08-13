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
			// a target map holding an `external` key is not the options form
			"legacy-map-ext": {
				commonjs: "legacy-map-ext",
				external: "not-a-target"
			},
			"required-used-ext": {
				external: "required-used-ext",
				sideEffects: false
			},
			"required-unused-ext": {
				external: "required-unused-ext",
				sideEffects: false
			},
			"required-free-ext": {
				external: "required-free-ext",
				sideEffects: false
			},
			"reexport-used-ext": {
				external: "reexport-used-ext",
				sideEffects: false
			},
			"reexport-unused-ext": {
				external: "reexport-unused-ext",
				sideEffects: false
			},
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
					// the twins share a target, so only their identifiers keep them apart
					const twins = [...compilation.modules].filter(
						(module) =>
							module instanceof ExternalModule &&
							(module.userRequest === "twin-free-ext" ||
								module.userRequest === "twin-ext")
					);
					expect(
						twins.map((module) => [
							/** @type {ExternalModule} */ (module).userRequest,
							/** @type {ExternalModule} */ (module).sideEffects,
							/** @type {ExternalModule} */ (module).identifier()
						])
					).toEqual([
						[
							"twin-free-ext",
							false,
							'external commonjs "twin"|sideEffects=false'
						],
						["twin-ext", undefined, 'external commonjs "twin"']
					]);
					for (const module of compilation.modules) {
						if (!(module instanceof ExternalModule)) continue;
						// the options form is unwrapped, it never reaches the request
						// (`external` may be a target map key, `sideEffects` never is)
						const request = module.request;
						if (
							typeof request === "object" &&
							!Array.isArray(request) &&
							"sideEffects" in request
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
