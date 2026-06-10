"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const fs = require("graceful-fs");
/** @type {{ sync: (pattern: string) => void }} */
const rimraf = require("rimraf");

let fixtureCount = 0;

/**
 * @typedef {{ mkdir: string[], writeFile: unknown[] }} CachingLogs
 * @typedef {import("../").StatsCompilation & { logs?: CachingLogs, assets: import("../").StatsAsset[], modules: import("../").StatsModule[] }} CachingStats
 */

describe("Compiler (caching)", () => {
	/**
	 * @param {string} entry entry file
	 * @param {import("../").Configuration} options webpack options
	 * @param {(stats: CachingStats, files: Record<string, string>, iteration: number) => void} callback done callback
	 * @returns {{ compilerInstance: import("../").Compiler, runAgain: (options: Record<string, unknown> | ((stats: CachingStats, files: Record<string, string>, iteration: number) => void), callback?: (stats: CachingStats, files: Record<string, string>, iteration: number) => void) => void }} helpers
	 */
	function compile(entry, options, callback) {
		const webpack = require("..");

		/** @type {import("../").WebpackOptionsNormalized} */
		const normalizedOptions =
			webpack.config.getNormalizedWebpackOptions(options);
		normalizedOptions.mode = "none";
		normalizedOptions.cache =
			/** @type {import("../").WebpackOptionsNormalized["cache"]} */ (
				/** @type {unknown} */ (true)
			);
		normalizedOptions.entry = /** @type {import("../").EntryNormalized} */ (
			/** @type {unknown} */ (entry)
		);
		normalizedOptions.optimization.moduleIds = "natural";
		normalizedOptions.optimization.minimize = false;
		normalizedOptions.context = path.join(__dirname, "fixtures");
		normalizedOptions.output.path = "/";
		normalizedOptions.output.filename = "bundle.js";
		normalizedOptions.output.pathinfo = true;
		/** @type {CachingLogs} */
		const logs = {
			mkdir: [],
			writeFile: []
		};

		const c = webpack(
			/** @type {import("../").Configuration} */ (
				/** @type {unknown} */ (normalizedOptions)
			)
		);
		/** @type {Record<string, string>} */
		const files = {};
		c.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ ({
				/**
				 * @param {string} dirPath directory path
				 * @param {(err: NodeJS.ErrnoException) => void} cb callback
				 */
				mkdir(dirPath, cb) {
					logs.mkdir.push(dirPath);
					const err = /** @type {NodeJS.ErrnoException} */ (new Error("error"));
					err.code = "EEXIST";
					cb(err);
				},
				/**
				 * @param {string} name file name
				 * @param {Buffer} content file content
				 * @param {() => void} cb callback
				 */
				writeFile(name, content, cb) {
					logs.writeFile.push(name, content);
					files[name] = content.toString("utf8");
					cb();
				},
				/**
				 * @param {string} _filePath file path
				 * @param {(err: Error) => void} cb callback
				 */
				stat(_filePath, cb) {
					cb(new Error("ENOENT"));
				}
			})
		);
		c.hooks.compilation.tap(
			"CompilerCachingTest",
			(compilation) => (compilation.bail = true)
		);

		let compilerIteration = 1;

		/**
		 * @param {Record<string, unknown> | ((stats: CachingStats, files: Record<string, string>, iteration: number) => void)} options run options or callback
		 * @param {((stats: CachingStats, files: Record<string, string>, iteration: number) => void)=} callback done callback
		 */
		function runCompiler(options, callback) {
			if (typeof options === "function") {
				callback = options;
				options = {};
			}
			c.run((err, rawStats) => {
				if (err) throw err;
				expect(typeof rawStats).toBe("object");
				const stats = /** @type {CachingStats} */ (
					/** @type {import("../").Stats} */ (rawStats).toJson({
						modules: true,
						reasons: true
					})
				);
				expect(typeof stats).toBe("object");
				expect(stats).toHaveProperty("errors");
				expect(Array.isArray(stats.errors)).toBe(true);
				if (/** @type {Record<string, unknown>} */ (options).expectErrors) {
					expect(stats.errors).toHaveLength(
						/** @type {number} */ (
							/** @type {Record<string, unknown>} */ (options).expectErrors
						)
					);
				} else if (stats.errors && stats.errors.length > 0) {
					expect(typeof stats.errors[0]).toBe("string");
					throw new Error(
						/** @type {string} */ (/** @type {unknown} */ (stats.errors[0]))
					);
				}
				stats.logs = logs;
				/** @type {(stats: CachingStats, files: Record<string, string>, iteration: number) => void} */ (
					callback
				)(stats, files, compilerIteration++);
			});
		}

		runCompiler(callback);

		return {
			compilerInstance: c,
			runAgain: runCompiler
		};
	}

	const tempFixturePath = path.join(
		__dirname,
		"fixtures",
		"temp-cache-fixture"
	);

	/**
	 * @returns {void}
	 */
	function cleanup() {
		rimraf.sync(`${tempFixturePath}-*`);
	}

	beforeAll(cleanup);

	afterAll(cleanup);

	/**
	 * @returns {{ rootPath: string, aFilepath: string, cFilepath: string }} temp fixture paths
	 */
	function createTempFixture() {
		const fixturePath = `${tempFixturePath}-${fixtureCount}`;
		const aFilepath = path.join(fixturePath, "a.js");
		const cFilepath = path.join(fixturePath, "c.js");

		// Remove previous copy if present
		rimraf.sync(fixturePath);

		// Copy over file since we"ll be modifying some of them
		fs.mkdirSync(fixturePath);
		fs.copyFileSync(path.join(__dirname, "fixtures", "a.js"), aFilepath);
		fs.copyFileSync(path.join(__dirname, "fixtures", "c.js"), cFilepath);

		fixtureCount++;
		return {
			rootPath: fixturePath,
			aFilepath,
			cFilepath
		};
	}

	it("should cache single file (with manual 1s wait)", (done) => {
		const options = {};
		const tempFixture = createTempFixture();

		const helper = compile(tempFixture.cFilepath, options, (stats, _files) => {
			// Not cached the first time
			expect(stats.assets[0].name).toBe("bundle.js");
			expect(stats.assets[0].emitted).toBe(true);

			helper.runAgain((stats, _files, _iteration) => {
				// Cached the second run
				expect(stats.assets[0].name).toBe("bundle.js");
				expect(stats.assets[0].emitted).toBe(false);

				const aContent = fs
					.readFileSync(tempFixture.aFilepath)
					.toString()
					.replace("This is a", "This is a MODIFIED");

				setTimeout(() => {
					fs.writeFileSync(tempFixture.aFilepath, aContent);

					helper.runAgain((stats, _files, _iteration) => {
						// Cached the third run
						expect(stats.assets[0].name).toBe("bundle.js");
						expect(stats.assets[0].emitted).toBe(true);

						done();
					});
				}, 1100);
			});
		});
	});

	it("should cache single file (even with no timeout)", (done) => {
		const options = {};
		const tempFixture = createTempFixture();

		const helper = compile(tempFixture.cFilepath, options, (stats, _files) => {
			// Not cached the first time
			expect(stats.assets[0].name).toBe("bundle.js");
			expect(stats.assets[0].emitted).toBe(true);

			helper.runAgain((stats, files, _iteration) => {
				// Cached the second run
				expect(stats.assets[0].name).toBe("bundle.js");
				expect(stats.assets[0].emitted).toBe(false);

				expect(files["/bundle.js"]).toMatch("This is a");

				const aContent = fs
					.readFileSync(tempFixture.aFilepath)
					.toString()
					.replace("This is a", "This is a MODIFIED");

				fs.writeFileSync(tempFixture.aFilepath, aContent);

				helper.runAgain((stats, files, _iteration) => {
					// Cached the third run
					expect(stats.assets[0].name).toBe("bundle.js");
					expect(stats.assets[0].emitted).toBe(true);

					expect(files["/bundle.js"]).toMatch("This is a MODIFIED");

					done();
				});
			});
		});
	});

	it("should only build when modified (with manual 2s wait)", (done) => {
		const options = {};
		const tempFixture = createTempFixture();

		const helper = compile(tempFixture.cFilepath, options, (stats, _files) => {
			// Built the first time
			expect(stats.modules[0].name).toMatch("c.js");
			expect(stats.modules[0].built).toBe(true);

			expect(stats.modules[1].name).toMatch("a.js");
			expect(stats.modules[1].built).toBe(true);

			setTimeout(() => {
				helper.runAgain((stats, _files, _iteration) => {
					// Not built when cached the second run
					expect(stats.modules[0].name).toMatch("c.js");
					// expect(stats.modules[0].built).toBe(false);

					expect(stats.modules[1].name).toMatch("a.js");
					// expect(stats.modules[1].built).toBe(false);

					const aContent = fs
						.readFileSync(tempFixture.aFilepath)
						.toString()
						.replace("This is a", "This is a MODIFIED");

					setTimeout(() => {
						fs.writeFileSync(tempFixture.aFilepath, aContent);

						helper.runAgain((stats, _files, _iteration) => {
							// And only a.js built after it was modified
							expect(stats.modules[0].name).toMatch("c.js");
							expect(stats.modules[0].built).toBe(false);

							expect(stats.modules[1].name).toMatch("a.js");
							expect(stats.modules[1].built).toBe(true);

							done();
						});
					}, 2100);
				});
			}, 4100);
		});
	});

	it("should build when modified (even with no timeout)", (done) => {
		const options = {};
		const tempFixture = createTempFixture();

		const helper = compile(tempFixture.cFilepath, options, (stats, _files) => {
			// Built the first time
			expect(stats.modules[0].name).toMatch("c.js");
			expect(stats.modules[0].built).toBe(true);

			expect(stats.modules[1].name).toMatch("a.js");
			expect(stats.modules[1].built).toBe(true);

			helper.runAgain((stats, _files, _iteration) => {
				// Not built when cached the second run
				expect(stats.modules[0].name).toMatch("c.js");
				// expect(stats.modules[0].built).toBe(false);

				expect(stats.modules[1].name).toMatch("a.js");
				// expect(stats.modules[1].built).toBe(false);

				const aContent = fs
					.readFileSync(tempFixture.aFilepath)
					.toString()
					.replace("This is a", "This is a MODIFIED");

				fs.writeFileSync(tempFixture.aFilepath, aContent);

				helper.runAgain((stats, _files, _iteration) => {
					// And only a.js built after it was modified
					expect(stats.modules[0].name).toMatch("c.js");
					// expect(stats.modules[0].built).toBe(false);

					expect(stats.modules[1].name).toMatch("a.js");
					expect(stats.modules[1].built).toBe(true);

					done();
				});
			});
		});
	});
});
