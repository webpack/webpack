"use strict";

require("../helpers/warmup-webpack");

const fs = require("fs");
const path = require("path");
const testDirectory = path.resolve(__dirname, "..");
const { Volume, createFsFromVolume } = require("memfs");
const webpack = require("../..");
const expectNoDeprecations = require("../helpers/expectNoDeprecations");

expectNoDeprecations();

describe("Watch", () => {
	it("should only compile a single time", (done) => {
		let counterBeforeCompile = 0;
		let counterDone = 0;
		let counterHandler = 0;
		const compiler = /** @type {import("../../").Compiler} */ (
			webpack(
				{
					context: path.resolve(testDirectory, "fixtures/watch"),
					watch: true,
					mode: "development",
					snapshot: {
						managedPaths: [/^(.+?[\\/]node_modules[\\/])/]
					},
					experiments: {
						futureDefaults: true
					},
					module: {
						// unsafeCache: false,
						rules: [
							{
								test: /\.js$/,
								use: "some-loader"
							}
						]
					},
					plugins: [
						(c) => {
							c.hooks.beforeCompile.tap("test", () => {
								counterBeforeCompile++;
							});
							c.hooks.done.tap("test", () => {
								counterDone++;
							});
						}
					]
				},
				(err, stats) => {
					if (err) return done(err);
					if (/** @type {import("../../").Stats} */ (stats).hasErrors()) {
						return done(
							new Error(/** @type {import("../../").Stats} */ (stats).toString())
						);
					}
					counterHandler++;
				}
			)
		);
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		setTimeout(() => {
			expect(counterBeforeCompile).toBe(1);
			expect(counterDone).toBe(1);
			expect(counterHandler).toBe(1);
			compiler.close(done);
		}, 5000);
	});

	it("should correctly emit asset when invalidation occurs again", (done) => {
		/**
		 * @param {unknown} err error
		 */
		function handleError(err) {
			if (err) done(/** @type {Error} */ (err));
		}
		let calls = 0;
		const compiler = webpack({
			mode: "development",
			context: path.resolve(testDirectory, "fixtures/watch"),
			plugins: [
				(c) => {
					// Ensure the second invalidation can occur during compiler running
					let once = false;
					c.hooks.afterCompile.tapAsync("LongTask", (_, cb) => {
						if (once) return cb();
						once = true;
						setTimeout(() => {
							cb();
						}, 1000);
					});
				},
				(c) => {
					c.hooks.done.tap("Test", () => {
						// Should emit assets twice, instead of once
						expect(calls).toBe(2);
						done();
					});
				}
			]
		});

		compiler.watch({}, handleError);
		compiler.hooks.emit.tap("Test", () => {
			calls++;
		});

		// First invalidation
		/** @type {import("../../").Watching} */ (compiler.watching).invalidate();
		// Second invalidation while compiler is still running
		setTimeout(() => {
			/** @type {import("../../").Watching} */ (compiler.watching).invalidate();
		}, 50);
	});

	it("should keep earlier stats readable after their modules are cleaned up", (done) => {
		const context = path.join(testDirectory, "js", "Watch", "stats-after-cleanup");
		const entry = path.join(context, "index.js");
		const changedFile = path.join(context, "a.js");
		fs.rmSync(context, { recursive: true, force: true });
		fs.mkdirSync(context, { recursive: true });
		fs.writeFileSync(entry, 'require("./a");');
		fs.writeFileSync(changedFile, "module.exports = 1;");
		const compiler = webpack({
			mode: "development",
			context,
			entry: "./index.js",
			cache: { type: "memory" }
		});
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		const later = new Date(Date.now() + 10000);
		/** @type {import("../../").Stats[]} */
		const builds = [];
		const run = () =>
			compiler.run((err, stats) => {
				if (err) return done(err);
				builds.push(/** @type {import("../../").Stats} */ (stats));
				if (builds.length === 1) {
					// the second build rebuilds the module instance the first stats hold
					fs.writeFileSync(changedFile, "module.exports = 2;");
					fs.utimesSync(changedFile, later, later);
				} else if (builds.length === 2) {
					// the third build no longer has the module, so it stays cleaned up
					fs.writeFileSync(entry, "");
					fs.utimesSync(entry, later, later);
				}
				if (builds.length < 3) return run();
				compiler.close((closeErr) => {
					if (closeErr) return done(closeErr);
					try {
						builds[0].toString({ all: true });
					} catch (error) {
						return done(error);
					}
					done();
				});
			});
		run();
	});

	it("should rebuild when a file is removed while a build is running", (done) => {
		const context = path.join(testDirectory, "js", "Watch", "removed-while-building");
		const removedFile = path.join(context, "b.js");
		fs.rmSync(context, { recursive: true, force: true });
		fs.mkdirSync(context, { recursive: true });
		fs.writeFileSync(path.join(context, "index.js"), 'require("./a");require("./b");');
		fs.writeFileSync(path.join(context, "a.js"), "module.exports = 1;");
		fs.writeFileSync(removedFile, "module.exports = 2;");
		let changed = false;
		const compiler = webpack({
			mode: "development",
			context,
			entry: "./index.js",
			plugins: [
				(c) => {
					// the paused watcher sees the removal before the next build replaces it
					c.hooks.afterCompile.tapAsync("RemoveWhileBuilding", (_, cb) => {
						if (!changed || !fs.existsSync(removedFile)) return cb();
						fs.unlinkSync(removedFile);
						setTimeout(cb, 500);
					});
				}
			]
		});
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		compiler.watch({ aggregateTimeout: 50 }, (err) => {
			if (err) return done(err);
			if (!changed) {
				changed = true;
				setTimeout(() => {
					fs.writeFileSync(path.join(context, "a.js"), "module.exports = 3;");
				}, 300);
			} else if (compiler.removedFiles && compiler.removedFiles.has(removedFile)) {
				compiler.close(done);
			}
		});
	}, 10000);
});
