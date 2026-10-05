"use strict";

const path = require("path");
const { NormalModule } = require("../../../..");

/** @typedef {{ builds: number, completed: number, callbacks: number, interrupted: Set<string> }} Events */
/** @typedef {import("../../../..").LoaderContext<Record<string, never>> & { watchEvents?: Events }} WatchLoaderContext */

/**
 * @param {Record<string, unknown> | undefined} _env environment
 * @param {{ srcPath: string }} paths fixture paths
 * @returns {import("../../../..").Configuration[]} watch configurations
 */
module.exports = (_env, { srcPath }) =>
	["development", "production"].map((mode, index) => {
		/** @type {Events} */
		const events = {
			builds: 0,
			completed: 0,
			callbacks: 0,
			interrupted: new Set()
		};
		return {
			context: path.join(srcPath, mode),
			mode: /** @type {"development" | "production"} */ (mode),
			devtool: false,
			cache: { type: index === 0 ? "memory" : "filesystem" },
			output: { clean: false, pathinfo: false, filename: `bundle${index}.js` },
			optimization: { minimize: false, moduleIds: "named", chunkIds: "named" },
			module: {
				rules: [{ test: /value\.js$/, loader: require.resolve("./loader") }]
			},
			plugins: [
				{
					events,
					/**
					 * @param {import("../../../..").Compiler} compiler watched compiler
					 * @returns {void}
					 */
					apply(compiler) {
						compiler.hooks.compilation.tap(
							"InFlightInvalidation",
							(compilation) => {
								if (!compiler.watchMode) return;
								events.builds++;
								NormalModule.getCompilationHooks(compilation).loader.tap(
									"InFlightInvalidation",
									(context) => {
										/** @type {WatchLoaderContext} */ (context).watchEvents =
											events;
									}
								);
							}
						);
						compiler.hooks.done.tap("InFlightInvalidation", () => {
							if (compiler.watchMode) events.completed++;
						});
					}
				}
			]
		};
	});
