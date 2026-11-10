"use strict";

const { getShortModuleName } = require("../../../../lib/ids/IdHelpers");

/** @type {import("../../../../").Configuration[]} */
const configs = [];

for (const { entry, external } of [
	{ entry: "./index.js", external: "path" },
	{ entry: "./index.js", external: ["path", "posix"] },
	{ entry: "./index.js", external: { commonjs: "path" } },
	{ entry: "./async.js", external: "path" }
]) {
	/** @type {{ source: string, map: import("webpack-sources").RawSourceMap }[]} */
	const results = [];
	for (const firstRequest of ["./shared", "../shared"]) {
		const filename = `${configs.length}/bundle.js`;
		configs.push({
			entry,
			mode: "development",
			target: "node",
			devtool: "source-map",
			output: { filename, chunkFilename: "[id].js" },
			optimization: { moduleIds: "named", chunkIds: "named" },
			externalsType: "commonjs",
			externals: [
				({ request }, callback) => {
					if (request !== "./shared" && request !== "../shared") {
						return callback();
					}
					setTimeout(
						() => callback(null, external),
						request === firstRequest ? 0 : 20
					);
				},
				{ fs: "commonjs fs", single: "commonjs assert", shared: "commonjs os" }
			],
			plugins: [
				(compiler) => {
					compiler.hooks.compilation.tap("test", (compilation) => {
						compiler.webpack.ExternalModule.getCompilationHooks(
							compilation
						).chunkCondition.tap("test", () => true);
						compilation.hooks.finishModules.tap("test", (modules) => {
							for (const module of modules) {
								if (
									module.is("external") &&
									module.libIdent({ context: compiler.context }) ===
										firstRequest
								) {
									expect(
										getShortModuleName(
											/** @type {import("../../../../lib/module/Module") & import("../../../../").Module} */ (
												module
											),
											compiler.context
										)
									).toBe(firstRequest);
									compilation.moduleGraph.addExtraReason(module, "test");
								}
							}
						});
						compilation.hooks.processAssets.tap(
							{
								name: "test",
								stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT
							},
							() => {
								const source = compilation.assets[filename].source().toString();
								const map = JSON.parse(
									compilation.assets[`${filename}.map`].source().toString()
								);
								map.file = "bundle.js";
								const result = { source, map };
								if (results.length > 0) expect(result).toEqual(results[0]);
								else results.push(result);
							}
						);
					});
				}
			]
		});
	}
}

module.exports = configs;
