"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const createWatchLoaderBarrier = require("../../../helpers/createWatchLoaderBarrier");

/**
 * @param {Record<string, unknown> | undefined} _env environment
 * @param {{ srcPath: string }} paths fixture paths
 * @returns {import("../../../..").Configuration[]} watch configurations
 */
module.exports = (_env, { srcPath }) =>
	["development", "production"].map((mode, index) => {
		const barrier = createWatchLoaderBarrier();
		let builds = 0;
		let completed = 0;
		let closed = 0;
		const plugin = {
			/** @type {(() => Promise<void>) | undefined} */
			run: undefined,
			/**
			 * @param {import("../../../..").Compiler} compiler watched compiler
			 * @returns {void}
			 */
			apply(compiler) {
				barrier.plugin(compiler);
				compiler.hooks.compilation.tap("ClosePending", () => {
					if (compiler.watchMode) builds++;
				});
				compiler.hooks.done.tap("ClosePending", () => {
					if (compiler.watchMode) completed++;
				});
				compiler.hooks.watchClose.tap("ClosePending", () => {
					closed++;
				});
				compiler.hooks.watchRun.tap("ClosePending", () => {
					plugin.run = async () => {
						const watching = compiler.watching;
						assert(watching);
						const reached = barrier.arm();
						try {
							fs.copyFileSync(
								path.join(compiler.context, "update/value.js"),
								path.join(compiler.context, "value.js")
							);
							await reached;
							fs.copyFileSync(
								path.join(compiler.context, "later/value.js"),
								path.join(compiler.context, "value.js")
							);
							watching.invalidate();
							let callbacks = 0;
							const closing = [0, 1].map(
								() =>
									new Promise((resolve, reject) => {
										watching.close((error) => {
											callbacks++;
											if (error) reject(error);
											else resolve(undefined);
										});
									})
							);
							expect(callbacks).toBe(0);
							expect(closed).toBe(0);
							barrier.release();
							await Promise.all(closing);
							expect(callbacks).toBe(2);
							expect(closed).toBe(1);
							expect(completed).toBe(1);
							expect(builds).toBe(2);
							expect(compiler.running).toBe(false);
							expect(compiler.watchMode).toBe(false);
							expect(compiler.watching).toBeUndefined();
						} finally {
							barrier.release();
						}
					};
				});
			}
		};
		return {
			context: path.join(srcPath, mode),
			mode: /** @type {"development" | "production"} */ (mode),
			devtool: false,
			cache: { type: index === 0 ? "memory" : "filesystem" },
			output: { clean: false, pathinfo: false, filename: `bundle${index}.js` },
			optimization: { minimize: false, moduleIds: "named", chunkIds: "named" },
			module: {
				rules: [
					{ test: /value\.js$/, loader: require.resolve("./blocking-loader") }
				]
			},
			plugins: [plugin]
		};
	});
