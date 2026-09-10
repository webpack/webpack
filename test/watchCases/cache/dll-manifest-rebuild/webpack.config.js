"use strict";

const path = require("path");
const { RawSource } = require("webpack-sources");
const webpack = require("../../../../");

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration} */
module.exports = (env, { srcPath }) => ({
	mode: "production",
	cache: {
		type: "memory"
	},
	optimization: {
		concatenateModules: false,
		minimize: false,
		providedExports: true
	},
	plugins: [
		new webpack.DllReferencePlugin({
			scope: "dll",
			// Returns the CommonJS DLL shape; stale namespace buildMeta reads `.default`.
			name: "function(id) { return { default: 'dll-default', added: 'dll-added' }; }",
			manifest: path.join(srcPath, "manifest.json")
		}),
		{
			apply(compiler) {
				compiler.hooks.compilation.tap(
					"DelegatedModuleCacheProbe",
					(compilation) => {
						let built = 0;
						let reused = 0;
						compilation.hooks.buildModule.tap(
							"DelegatedModuleCacheProbe",
							(module) => {
								if (module.identifier().startsWith("delegated ")) built++;
							}
						);
						compilation.hooks.stillValidModule.tap(
							"DelegatedModuleCacheProbe",
							(module) => {
								if (module.identifier().startsWith("delegated ")) reused++;
							}
						);
						compilation.hooks.processAssets.tap(
							{
								name: "DelegatedModuleCacheProbe",
								stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT
							},
							() => {
								compilation.emitAsset(
									"delegated-cache-probe.json",
									new RawSource(`${JSON.stringify({ built, reused })}\n`)
								);
							}
						);
					}
				);
			}
		}
	]
});
