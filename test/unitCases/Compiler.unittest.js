"use strict";

require("../helpers/warmup-webpack");

const path = require("path");

const testDirectory = path.resolve(__dirname, "..");

const { Volume, createFsFromVolume } = require("memfs");
const Stats = require("../../lib/stats/Stats");
const deprecationTracking = require("../helpers/deprecationTracking");

describe("Compiler", () => {
	/** @type {import("../../").Compiler} */
	let compiler;

	afterEach((callback) => {
		if (compiler) {
			compiler.close(callback);
			compiler = /** @type {import("../../").Compiler} */ (
				/** @type {unknown} */ (undefined)
			);
		} else {
			callback();
		}
	});

	describe("methods", () => {
		/** @type {import("../../").Compiler} */
		let compiler;

		beforeEach(() => {
			const webpack = require("../..");

			compiler = webpack({
				entry: "./c",
				context: path.join(testDirectory, "fixtures"),
				output: {
					path: "/directory",
					pathinfo: true
				}
			});
		});

		afterEach((callback) => {
			if (compiler) {
				compiler.close(callback);
				compiler = /** @type {import("../../").Compiler} */ (
					/** @type {unknown} */ (undefined)
				);
			} else {
				callback();
			}
		});

		it("default platform info", (done) => {
			const platform = compiler.platform;
			expect(platform.web).toBe(true);
			expect(platform.node).toBe(false);
			done();
		});

		describe("purgeInputFileSystem", () => {
			it("invokes purge() if inputFileSystem.purge", (done) => {
				const mockPurge = jest.fn();
				compiler.inputFileSystem =
					/** @type {import("../../").InputFileSystem} */ (
						/** @type {unknown} */ ({ purge: mockPurge })
					);
				compiler.purgeInputFileSystem();
				expect(mockPurge).toHaveBeenCalledTimes(1);
				done();
			});

			it("does NOT invoke purge() if !inputFileSystem.purge", (done) => {
				const mockPurge = jest.fn();
				compiler.inputFileSystem = null;
				compiler.purgeInputFileSystem();
				expect(mockPurge).not.toHaveBeenCalled();
				done();
			});
		});

		describe("isChild", () => {
			it("returns booleanized this.parentCompilation", (done) => {
				const c =
					/** @type {Omit<import("../../").Compiler, "parentCompilation"> & { parentCompilation: unknown }} */ (
						/** @type {unknown} */ (compiler)
					);
				c.parentCompilation = "stringyStringString";
				const response1 = compiler.isChild();
				expect(response1).toBe(true);

				c.parentCompilation = 123456789;
				const response2 = compiler.isChild();
				expect(response2).toBe(true);

				c.parentCompilation = {
					what: "I belong to an object"
				};
				const response3 = compiler.isChild();
				expect(response3).toBe(true);

				c.parentCompilation = ["Array", 123, true, null, [], () => {}];
				const response4 = compiler.isChild();
				expect(response4).toBe(true);

				c.parentCompilation = false;
				const response5 = compiler.isChild();
				expect(response5).toBe(false);

				c.parentCompilation = 0;
				const response6 = compiler.isChild();
				expect(response6).toBe(false);

				c.parentCompilation = null;
				const response7 = compiler.isChild();
				expect(response7).toBe(false);

				c.parentCompilation = "";
				const response8 = compiler.isChild();
				expect(response8).toBe(false);

				c.parentCompilation = Number.NaN;
				const response9 = compiler.isChild();
				expect(response9).toBe(false);
				done();
			});
		});
	});

	it("platformPlugin", (done) => {
		const webpack = require("../..");

		const compiler = webpack(
			/** @type {import("../../").Configuration} */ ({
				entry: "./c",
				context: path.join(testDirectory, "fixtures"),
				output: {
					path: "/directory"
				},
				plugins: [
					new (require("../../lib/config/PlatformPlugin"))({ node: true }),
					(compiler) => {
						compiler.hooks.afterEnvironment.tap("test", () => {
							const platform = compiler.platform;
							expect(platform.node).toBe(true);
							expect(platform.web).toBe(true);
						});
					}
				]
			})
		);
		compiler.close(done);
	});

	it("should release codeGenerationResults on close while Stats stays usable and afterDone still sees them (#15521)", (done) => {
		const webpack = require("../..");

		const compiler = webpack({
			context: path.join(testDirectory, "fixtures"),
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		/** @type {number} */
		let sizeSeenByAfterDone;
		compiler.hooks.afterDone.tap("Test", (stats) => {
			sizeSeenByAfterDone = /** @type {import("../../").CodeGenerationResults} */ (
				stats.compilation.codeGenerationResults
			).map.size;
		});
		compiler.run((err, stats) => {
			if (err) return done(err);
			const { compilation } = /** @type {import("../../").Stats} */ (stats);
			expect(
				/** @type {import("../../").CodeGenerationResults} */ (
					compilation.codeGenerationResults
				).map.size
			).toBeGreaterThan(0);
			// close() runs inside the run callback, i.e. before Compiler.run fires
			// afterDone. The release is deferred a microtask, so afterDone still
			// observes the results; assert via setTimeout once the defer ran.
			compiler.close((closeErr) => {
				if (closeErr) return done(closeErr);
				setTimeout(() => {
					expect(sizeSeenByAfterDone).toBeGreaterThan(0);
					expect(
						/** @type {import("../../").CodeGenerationResults} */ (
							compilation.codeGenerationResults
						).map.size
					).toBe(0);
					expect(
						typeof (/** @type {import("../../").Stats} */ (stats).toJson().hash)
					).toBe("string");
					done();
				}, 0);
			});
		});
	});

	/**
	 * @param {import("../../").AssetInfo} info info the asset carries
	 * @returns {import("../../").WebpackPluginInstance} a plugin emitting an asset which carries it
	 */
	function emitAssetWithFileAttributes(info) {
		const webpack = require("../..");
		const { RawSource } = require("webpack-sources");

		return {
			/**
			 * @param {import("../../").Compiler} compiler the compiler
			 * @returns {void}
			 */
			apply(compiler) {
				compiler.hooks.thisCompilation.tap("Test", (compilation) => {
					compilation.hooks.processAssets.tap(
						{
							name: "Test",
							stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
						},
						() => {
							compilation.emitAsset(
								"stamped.txt",
								new RawSource("stamped"),
								info
							);
						}
					);
				});
			}
		};
	}

	it("should stamp an asset which carries times onto a file it did not rewrite", (done) => {
		const webpack = require("../..");

		const timestamps = {
			atime: Date.UTC(2020, 0, 2, 3, 4, 5),
			mtime: Date.UTC(2020, 0, 3, 4, 5, 6)
		};
		compiler = webpack({
			context: path.join(testDirectory, "fixtures"),
			mode: "production",
			entry: "./a",
			output: { path: "/directory", filename: "bundle.js" },
			plugins: [emitAssetWithFileAttributes({ timestamps })]
		});
		const volume = new Volume();
		const outputFileSystem = createFsFromVolume(volume);
		// the content the build emits, already on disk with times of its own, so
		// the emit compares it, writes nothing, and only the times are left to set
		volume.fromJSON({ "/directory/stamped.txt": "stamped" });
		outputFileSystem.utimesSync(
			"/directory/stamped.txt",
			new Date(0),
			new Date(0)
		);
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (outputFileSystem)
		);
		compiler.run((err, stats) => {
			if (err) return done(err);
			expect(
				/** @type {import("../../").Stats} */ (
					stats
				).compilation.comparedForEmitAssets.has("stamped.txt")
			).toBe(true);
			expect(outputFileSystem.statSync("/directory/stamped.txt").mtimeMs).toBe(
				timestamps.mtime
			);
			done();
		});
	});

	it("should fail when the output file system cannot set the times", (done) => {
		const webpack = require("../..");

		compiler = webpack({
			context: path.join(testDirectory, "fixtures"),
			mode: "production",
			entry: "./a",
			output: { path: "/directory", filename: "bundle.js" },
			plugins: [
				emitAssetWithFileAttributes({
					timestamps: { atime: Date.now(), mtime: Date.now() }
				})
			]
		});
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ ({
				...createFsFromVolume(new Volume()),
				utimes: undefined
			})
		);
		compiler.run((err) => {
			expect(/** @type {Error} */ (err).message).toMatch(
				/Unable to set the times of '.*stamped\.txt': the output file system cannot set them/
			);
			done();
		});
	});

	it("should give an asset which carries permissions to a file it did not rewrite", (done) => {
		const webpack = require("../..");

		compiler = webpack({
			context: path.join(testDirectory, "fixtures"),
			mode: "production",
			entry: "./a",
			output: { path: "/directory", filename: "bundle.js" },
			plugins: [emitAssetWithFileAttributes({ mode: 0o755 })]
		});
		const volume = new Volume();
		const outputFileSystem = createFsFromVolume(volume);
		volume.fromJSON({ "/directory/stamped.txt": "stamped" });
		outputFileSystem.chmodSync("/directory/stamped.txt", 0o644);
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (outputFileSystem)
		);
		compiler.run((err, stats) => {
			if (err) return done(err);
			expect(
				/** @type {import("../../").Stats} */ (
					stats
				).compilation.comparedForEmitAssets.has("stamped.txt")
			).toBe(true);
			expect(
				outputFileSystem.statSync("/directory/stamped.txt").mode & 0o777
			).toBe(0o755);
			done();
		});
	});

	it("should fail when the output file system cannot set the permissions", (done) => {
		const webpack = require("../..");

		compiler = webpack({
			context: path.join(testDirectory, "fixtures"),
			mode: "production",
			entry: "./a",
			output: { path: "/directory", filename: "bundle.js" },
			plugins: [emitAssetWithFileAttributes({ mode: 0o755 })]
		});
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ ({
				...createFsFromVolume(new Volume()),
				chmod: undefined
			})
		);
		compiler.run((err) => {
			expect(/** @type {Error} */ (err).message).toMatch(
				/Unable to set the permissions of '.*stamped\.txt': the output file system cannot set them/
			);
			done();
		});
	});

	it("should not emit compilation errors in async (watch)", async () => {
		const createStats = (/** @type {import("../../").Configuration} */ options) =>
			new Promise((resolve, reject) => {
				const webpack = require("../..");

				const c = webpack(options);
				c.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
					/** @type {unknown} */ (createFsFromVolume(new Volume()))
				);
				const watching = /** @type {import("../../").Watching} */ (
					c.watch({}, (err, stats) => {
						/** @type {import("../../").Watching} */ (watching).close(() => {
							if (err) return reject(err);
							resolve(stats);
						});
					})
				);
			});
		const stats = await createStats({
			context: testDirectory,
			mode: "production",
			entry: "./missing-file",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		expect(stats).toBeInstanceOf(Stats);
	});

	it("should not be running twice at a time (run)", (done) => {
		const webpack = require("../..");

		compiler = webpack({
			context: testDirectory,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		compiler.run((err, _stats) => {
			if (err) return done(err);
		});
		compiler.run((err, _stats) => {
			if (err) return done();
		});
	});

	it("should not be running twice at a time (watch)", (done) => {
		const webpack = require("../..");

		compiler = webpack({
			context: testDirectory,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		compiler.watch({}, (err, _stats) => {
			if (err) return done(err);
		});
		compiler.watch({}, (err, _stats) => {
			if (err) return done();
		});
	});

	it("should not be running twice at a time (run - watch)", (done) => {
		const webpack = require("../..");

		compiler = webpack({
			context: testDirectory,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		compiler.run((err, _stats) => {
			if (err) return done(err);
		});
		compiler.watch({}, (err, _stats) => {
			if (err) return done();
		});
	});

	it("should not be running twice at a time (watch - run)", (done) => {
		const webpack = require("../..");

		compiler = webpack({
			context: testDirectory,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		compiler.watch({}, (err, _stats) => {
			if (err) return done(err);
		});
		compiler.run((err, _stats) => {
			if (err) return done();
		});
	});

	it("should not be running twice at a time (instance cb)", (done) => {
		const webpack = require("../..");

		compiler = /** @type {import("../../").Compiler} */ (
			webpack(
				{
					context: testDirectory,
					mode: "production",
					entry: "./c",
					output: {
						path: "/directory",
						filename: "bundle.js"
					}
				},
				() => {}
			)
		);
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		compiler.run((err, _stats) => {
			if (err) return done();
		});
	});

	it("should run again correctly after first compilation", (done) => {
		const webpack = require("../..");

		compiler = webpack({
			context: testDirectory,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		compiler.run((err, stats1) => {
			if (err) return done(err);

			compiler.run((err, _stats2) => {
				if (err) return done(err);
				expect(
					/** @type {import("../../").Stats} */ (stats1).toString({ all: true })
				).toBeTypeOf("string");
				done();
			});
		});
	});

	it("should set idle state once when run finishes", (done) => {
		const webpack = require("../..");

		compiler = webpack({
			context: testDirectory,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		let idle = compiler.idle;
		let idleWriteCount = 0;
		Object.defineProperty(compiler, "idle", {
			configurable: true,
			enumerable: true,
			get() {
				return idle;
			},
			set(value) {
				idleWriteCount++;
				idle = value;
			}
		});
		compiler.run((err, _stats) => {
			if (err) return done(err);
			expect(idleWriteCount).toBe(1);
			done();
		});
	});

	it("should watch again correctly after first compilation", (done) => {
		const webpack = require("../..");

		compiler = webpack({
			context: testDirectory,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		compiler.run((err, _stats) => {
			if (err) return done(err);

			const watching = /** @type {import("../../").Watching} */ (
				compiler.watch({}, (err, _stats) => {
					if (err) return done(err);
					watching.close(done);
				})
			);
		});
	});

	it("should run again correctly after first closed watch", (done) => {
		const webpack = require("../..");

		compiler = webpack({
			context: testDirectory,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		const watching = /** @type {import("../../").Watching} */ (
			compiler.watch({}, (err, _stats) => {
				if (err) return done(err);
			})
		);
		watching.close(() => {
			compiler.run((err, _stats) => {
				if (err) return done(err);
				done();
			});
		});
	});

	it("should set compiler.watching correctly", (done) => {
		const webpack = require("../..");

		compiler = webpack({
			context: testDirectory,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		const watching = /** @type {import("../../").Watching} */ (
			compiler.watch({}, (err, _stats) => {
				if (err) return done(err);
				watching.close(done);
			})
		);
		expect(compiler.watching).toBe(watching);
	});

	it("should watch again correctly after first closed watch", (done) => {
		const webpack = require("../..");

		compiler = webpack({
			context: testDirectory,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		const watching = /** @type {import("../../").Watching} */ (
			compiler.watch({}, (err, _stats) => {
				if (err) return done(err);
			})
		);
		watching.close(() => {
			compiler.watch({}, (err, _stats) => {
				if (err) return done(err);
				done();
			});
		});
	});

	it("should run again correctly inside afterDone hook", (done) => {
		const webpack = require("../..");

		compiler = webpack({
			context: testDirectory,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		let once = true;
		compiler.hooks.afterDone.tap("RunAgainTest", () => {
			if (!once) return;
			once = false;
			compiler.run((err, _stats) => {
				if (err) return done(err);
				done();
			});
		});
		compiler.run((err, _stats) => {
			if (err) return done(err);
		});
	});

	it("should call afterDone hook after other callbacks (run)", (done) => {
		const webpack = require("../..");

		compiler = webpack({
			context: testDirectory,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		const runCb = jest.fn();
		const doneHookCb = jest.fn();
		compiler.hooks.done.tap("afterDoneRunTest", doneHookCb);
		compiler.hooks.afterDone.tap("afterDoneRunTest", () => {
			expect(runCb).toHaveBeenCalled();
			expect(doneHookCb).toHaveBeenCalled();
			done();
		});
		compiler.run((err, _stats) => {
			if (err) return done(err);
			runCb();
		});
	});

	it("should call afterDone hook after other callbacks (instance cb)", (done) => {
		const instanceCb = jest.fn();

		const webpack = require("../..");

		compiler = /** @type {import("../../").Compiler} */ (
			webpack(
				{
					context: testDirectory,
					mode: "production",
					entry: "./c",
					output: {
						path: "/directory",
						filename: "bundle.js"
					}
				},
				(err, _stats) => {
					if (err) return done(err);
					instanceCb();
				}
			)
		);
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		const doneHookCb = jest.fn();
		compiler.hooks.done.tap("afterDoneRunTest", doneHookCb);
		compiler.hooks.afterDone.tap("afterDoneRunTest", () => {
			expect(instanceCb).toHaveBeenCalled();
			expect(doneHookCb).toHaveBeenCalled();
			done();
		});
	});

	it("should call afterDone hook after other callbacks (watch)", (done) => {
		const webpack = require("../..");

		compiler = webpack({
			context: testDirectory,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		const invalidHookCb = jest.fn();
		const doneHookCb = jest.fn();
		const watchCb = jest.fn();
		const invalidateCb = jest.fn();
		compiler.hooks.invalid.tap("afterDoneWatchTest", invalidHookCb);
		compiler.hooks.done.tap("afterDoneWatchTest", doneHookCb);
		compiler.hooks.afterDone.tap("afterDoneWatchTest", () => {
			expect(invalidHookCb).toHaveBeenCalled();
			expect(doneHookCb).toHaveBeenCalled();
			expect(watchCb).toHaveBeenCalled();
			expect(invalidateCb).toHaveBeenCalled();
			watching.close(done);
		});
		const watching = /** @type {import("../../").Watching} */ (
			compiler.watch({}, (err, _stats) => {
				if (err) return done(err);
				watchCb();
			})
		);
		process.nextTick(() => {
			watching.invalidate(invalidateCb);
		});
	});

	it("should call afterDone hook after other callbacks (watch close)", (done) => {
		const webpack = require("../..");

		compiler = webpack({
			context: testDirectory,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		const invalidHookCb = jest.fn();
		const watchCloseCb = jest.fn();
		const watchCloseHookCb = jest.fn();
		const invalidateCb = jest.fn();
		compiler.hooks.invalid.tap("afterDoneWatchTest", invalidHookCb);
		compiler.hooks.watchClose.tap("afterDoneWatchTest", watchCloseHookCb);
		compiler.hooks.afterDone.tap("afterDoneWatchTest", () => {
			expect(invalidHookCb).toHaveBeenCalled();
			expect(watchCloseCb).toHaveBeenCalled();
			expect(watchCloseHookCb).toHaveBeenCalled();
			expect(invalidateCb).toHaveBeenCalled();
			done();
		});
		const watch = /** @type {import("../../").Watching} */ (
			compiler.watch({}, (err, _stats) => {
				if (err) return done(err);
				watch.close(watchCloseCb);
			})
		);
		process.nextTick(() => {
			watch.invalidate(invalidateCb);
		});
	});

	it("should flag watchMode as true in watch", (done) => {
		const webpack = require("../..");

		compiler = webpack({
			context: testDirectory,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});

		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);

		const watch = /** @type {import("../../").Watching} */ (
			compiler.watch({}, (err) => {
				if (err) return done(err);
				expect(compiler.watchMode).toBeTruthy();
				watch.close(() => {
					expect(compiler.watchMode).toBeFalsy();
					done();
				});
			})
		);
	});

	it("should call the failed-hook on error", (done) => {
		const failedSpy = jest.fn();

		const webpack = require("../..");

		compiler = webpack({
			bail: true,
			context: testDirectory,
			mode: "production",
			entry: "./missing",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.hooks.failed.tap("CompilerTest", failedSpy);
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		compiler.run((err, _stats) => {
			expect(err).toBeTruthy();
			expect(failedSpy).toHaveBeenCalledTimes(1);
			expect(failedSpy).toHaveBeenCalledWith(err);
			done();
		});
	});

	it("should deprecate when watch option is used without callback", () => {
		const tracker = deprecationTracking.start();

		const webpack = require("../..");

		compiler = webpack({
			watch: true
		});
		const deprecations = tracker();
		expect(deprecations).toEqual([
			expect.objectContaining({
				code: "DEP_WEBPACK_WATCH_WITHOUT_CALLBACK"
			})
		]);
	});
});
