"use strict";

const assert = require("assert");
const path = require("path");
const createWatchLoaderBarrier = require("../../../helpers/createWatchLoaderBarrier");
const createWatchTestSession = require("../../../helpers/watchTestSession");

/** @import { ScenarioOptions } from "../../../helpers/watchTestSession" */

/**
 * @param {ScenarioOptions} options suite options
 * @returns {void}
 */
module.exports = (options) => {
	for (const mode of /** @type {const} */ (["development", "production"])) {
		for (const scenario of ["edit", "consecutive", "close"]) {
			it(`should handle ${scenario} during compilation in ${mode}`, async () => {
				const barrier = createWatchLoaderBarrier();
				let compilations = 0;
				let completed = 0;
				let closed = 0;
				const session = createWatchTestSession(
					path.join(options.directory, `${mode}-${scenario}`),
					{
						mode,
						experiments: options.experiments,
						cache: { type: mode === "development" ? "memory" : "filesystem" },
						optimization: {
							minimize: false,
							moduleIds: "named",
							chunkIds: "named"
						},
						module: {
							rules: [
								{
									test: /value\.js$/,
									use: path.join(__dirname, "blocking-loader.js")
								}
							]
						},
						plugins: [
							barrier.plugin,
							(compiler) => {
								compiler.hooks.compilation.tap("WatchLifecycle", () => {
									if (compiler.watchMode) compilations++;
								});
								compiler.hooks.done.tap("WatchLifecycle", () => {
									if (compiler.watchMode) completed++;
								});
								compiler.hooks.watchClose.tap("WatchLifecycle", () => {
									closed++;
								});
							}
						]
					}
				);
				try {
					session.write({
						"index.js": 'module.exports = require("./value");',
						"value.js": "module.exports = 0;"
					});
					await session.compare(await session.start());
					expect(session.readExports()).toBe(0);
					const reached = barrier.arm();
					session.write({ "value.js": "module.exports = 1;" });
					if (scenario === "close") {
						const watching = session.compiler.watching;
						assert(watching);
						watching.invalidate();
						await reached;
						session.write({ "value.js": "module.exports = 2;" });
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
						expect(compilations).toBe(2);
						expect(session.compiler.running).toBe(false);
						expect(session.compiler.watchMode).toBe(false);
						expect(session.compiler.watching).toBeUndefined();
						return;
					}
					let callbacks = 0;
					/** @returns {Promise<void>} completed invalidation */
					const invalidate = () =>
						session.invalidate().then(() => {
							callbacks++;
						});
					const next = session.nextBuild();
					const invalidations = [invalidate()];
					await reached;
					if (scenario === "edit") {
						session.write({ "value.js": "module.exports = 2;" });
						invalidations.push(invalidate());
					} else {
						session.write({
							"index.js": 'module.exports = require("./added");',
							"value.js": null,
							"added.js": "module.exports = 20;"
						});
						invalidations.push(invalidate());
						session.write({ "added.js": "module.exports = 30;" });
						invalidations.push(invalidate());
					}
					barrier.release();
					const stats = await next;
					await Promise.all(invalidations);
					expect(stats.hasErrors()).toBe(false);
					await session.compare(stats);
					expect(session.readExports()).toBe(scenario === "edit" ? 2 : 30);
					expect(callbacks).toBe(invalidations.length);
					expect(completed).toBe(2);
					expect(compilations).toBe(3);
					session.write({
						[scenario === "edit" ? "value.js" : "added.js"]:
							"module.exports = 40;"
					});
					const following = session.nextBuild();
					await session.invalidate();
					await session.compare(await following);
					expect(session.readExports()).toBe(40);
					expect(callbacks).toBe(invalidations.length);
					expect(completed).toBe(3);
					expect(compilations).toBe(4);
				} finally {
					barrier.release();
					await session.close();
				}
			}, 30000);
		}
	}
};
