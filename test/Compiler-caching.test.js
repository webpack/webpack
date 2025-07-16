"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const fs = require("graceful-fs");
const rimraf = require("rimraf");

let fixtureCount = 0;

describe("Compiler (caching)", () => {
	jest.setTimeout(15000);

	function compile(entry, options, callback) {
		const webpack = require("..");

		options = webpack.config.getNormalizedWebpackOptions(options);
		options.mode = "none";
		options.cache = true;
		options.entry = entry;
		options.optimization.moduleIds = "natural";
		options.optimization.minimize = false;
		options.context = path.join(__dirname, "fixtures");
		options.output.path = "/";
		options.output.filename = "bundle.js";
		options.output.pathinfo = true;
		const logs = {
			mkdir: [],
			writeFile: []
		};

		const c = webpack(options);
		const files = {};
		c.outputFileSystem = {
			mkdir(path, callback) {
				logs.mkdir.push(path);
				const err = new Error("error");
				err.code = "EEXIST";
				callback(err);
			},
			writeFile(name, content, callback) {
				logs.writeFile.push(name, content);
				files[name] = content.toString("utf8");
				callback();
			},
			stat(path, callback) {
				callback(new Error("ENOENT"));
			}
		};
		c.hooks.compilation.tap(
			"CompilerCachingTest",
			(compilation) => (compilation.bail = true)
		);

		let compilerIteration = 1;

		function runCompiler(options, callback) {
			if (typeof options === "function") {
				callback = options;
				options = {};
			}
			c.run((err, stats) => {
				if (err) throw err;
				expect(typeof stats).toBe("object");
				stats = stats.toJson({
					modules: true,
					reasons: true
				});
				expect(typeof stats).toBe("object");
				expect(stats).toHaveProperty("errors");
				expect(Array.isArray(stats.errors)).toBe(true);
				if (options.expectErrors) {
					expect(stats.errors).toHaveLength(options.expectErrors);
				} else if (stats.errors.length > 0) {
					expect(typeof stats.errors[0]).toBe("string");
					throw new Error(stats.errors[0]);
				}
				stats.logs = logs;
				callback(stats, files, compilerIteration++);
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
