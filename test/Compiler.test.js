"use strict";

const path = require("path");

const webpack = require("..");
const Stats = require("../lib/Stats");
const { createFsFromVolume, Volume } = require("memfs");
const captureStdio = require("./helpers/captureStdio");
const deprecationTracking = require("./helpers/deprecationTracking");

describe("Compiler", () => {
	jest.setTimeout(20000);
	function compile(entry, options, callback) {
		const noOutputPath = !options.output || !options.output.path;
		options = webpack.config.getNormalizedWebpackOptions(options);
		if (!options.mode) options.mode = "production";
		options.entry = entry;
		options.context = path.join(__dirname, "fixtures");
		if (noOutputPath) options.output.path = "/";
		options.output.pathinfo = true;
		options.optimization = {
			minimize: false
		};
		const logs = {
			mkdir: [],
			writeFile: []
		};

		const c = webpack(options);
		const files = {};
		c.outputFileSystem = {
			mkdir(path, callback) {
				logs.mkdir.push(path);
				const err = new Error();
				err.code = "EEXIST";
				callback(err);
			},
			writeFile(name, content, callback) {
				logs.writeFile.push(name, content);
				files[name] = content.toString("utf-8");
				callback();
			},
			stat(path, callback) {
				callback(new Error("ENOENT"));
			}
		};
		c.hooks.compilation.tap(
			"CompilerTest",
			compilation => (compilation.bail = true)
		);
		c.run((err, stats) => {
			if (err) throw err;
			expect(typeof stats).toBe("object");
			const compilation = stats.compilation;
			stats = stats.toJson({
				modules: true,
				reasons: true
			});
			expect(typeof stats).toBe("object");
			expect(stats).toHaveProperty("errors");
			expect(Array.isArray(stats.errors)).toBe(true);
			if (stats.errors.length > 0) {
				expect(stats.errors[0]).toBeInstanceOf(Error);
				throw stats.errors[0];
			}
			stats.logs = logs;
			callback(stats, files, compilation);
		});
	}

	it("should compile a single file to deep output", done => {
		compile(
			"./c",
			{
				output: {
					path: "/what",
					filename: "the/hell.js"
				}
			},
			(stats, files) => {
				expect(stats.logs.mkdir).toEqual(["/what", "/what/the"]);
				done();
			}
		);
	});

	it("should compile a single file", done => {
		compile("./c", {}, (stats, files) => {
			expect(Object.keys(files)).toEqual(["/main.js"]);
			const bundle = files["/main.js"];
			expect(bundle).toMatch("function __webpack_require__(");
			expect(bundle).toMatch(/__webpack_require__\(\/\*! \.\/a \*\/ \w+\);/);
			expect(bundle).toMatch("./c.js");
			expect(bundle).toMatch("./a.js");
			expect(bundle).toMatch("This is a");
			expect(bundle).toMatch("This is c");
			expect(bundle).not.toMatch("2: function(");
			expect(bundle).not.toMatch("window");
			expect(bundle).not.toMatch("jsonp");
			expect(bundle).not.toMatch("fixtures");
			done();
		});
	});

	it("should compile a complex file", done => {
		compile("./main1", {}, (stats, files) => {
			expect(Object.keys(files)).toEqual(["/main.js"]);
			const bundle = files["/main.js"];
			expect(bundle).toMatch("function __webpack_require__(");
			expect(bundle).toMatch("__webpack_require__(/*! ./a */");
			expect(bundle).toMatch("./main1.js");
			expect(bundle).toMatch("./a.js");
			expect(bundle).toMatch("./b.js");
			expect(bundle).toMatch("./node_modules/m1/a.js");
			expect(bundle).toMatch("This is a");
			expect(bundle).toMatch("This is b");
			expect(bundle).toMatch("This is m1/a");
			expect(bundle).not.toMatch("4: function(");
			expect(bundle).not.toMatch("window");
			expect(bundle).not.toMatch("jsonp");
			expect(bundle).not.toMatch("fixtures");
			done();
		});
	});

	it("should compile a file with transitive dependencies", done => {
		compile("./abc", {}, (stats, files) => {
			expect(Object.keys(files)).toEqual(["/main.js"]);
			const bundle = files["/main.js"];
			expect(bundle).toMatch("function __webpack_require__(");
			expect(bundle).toMatch("__webpack_require__(/*! ./a */");
			expect(bundle).toMatch("__webpack_require__(/*! ./b */");
			expect(bundle).toMatch("__webpack_require__(/*! ./c */");
			expect(bundle).toMatch("./abc.js");
			expect(bundle).toMatch("./a.js");
			expect(bundle).toMatch("./b.js");
			expect(bundle).toMatch("./c.js");
			expect(bundle).toMatch("This is a");
			expect(bundle).toMatch("This is b");
			expect(bundle).toMatch("This is c");
			expect(bundle).not.toMatch("4: function(");
			expect(bundle).not.toMatch("window");
			expect(bundle).not.toMatch("jsonp");
			expect(bundle).not.toMatch("fixtures");
			done();
		});
	});

	it("should compile a file with multiple chunks", done => {
		compile("./chunks", {}, (stats, files) => {
			expect(stats.chunks).toHaveLength(2);
			expect(Object.keys(files)).toEqual(["/main.js", "/394.js"]);
			const bundle = files["/main.js"];
			const chunk = files["/394.js"];
			expect(bundle).toMatch("function __webpack_require__(");
			expect(bundle).toMatch("__webpack_require__(/*! ./b */");
			expect(chunk).not.toMatch("__webpack_require__(/* ./b */");
			expect(bundle).toMatch("./chunks.js");
			expect(chunk).toMatch("./a.js");
			expect(chunk).toMatch("./b.js");
			expect(chunk).toMatch("This is a");
			expect(bundle).not.toMatch("This is a");
			expect(chunk).toMatch("This is b");
			expect(bundle).not.toMatch("This is b");
			expect(bundle).not.toMatch("4: function(");
			expect(bundle).not.toMatch("fixtures");
			expect(chunk).not.toMatch("fixtures");
			expect(bundle).toMatch("webpackChunk");
			expect(chunk).toMatch('self["webpackChunk"] || []).push');
			done();
		});
	});

	it("should not evaluate constants in asm.js", done => {
		compile("./asmjs", {}, (stats, files) => {
			expect(Object.keys(files)).toEqual(["/main.js"]);
			const bundle = files["/main.js"];
			expect(bundle).toMatch('"use asm";');
			expect(bundle).toMatch("101");
			expect(bundle).toMatch("102");
			expect(bundle).toMatch("103");
			expect(bundle).toMatch("104");
			expect(bundle).toMatch("105");
			expect(bundle).not.toMatch("106");
			expect(bundle).not.toMatch("107");
			expect(bundle).not.toMatch("108");
			expect(bundle).toMatch("109");
			expect(bundle).toMatch("110");
			done();
		});
	});

	describe("methods", () => {
		let compiler;
		beforeEach(() => {
			compiler = webpack({
				entry: "./c",
				context: path.join(__dirname, "fixtures"),
				output: {
					path: "/directory",
					pathinfo: true
				}
			});
		});
		describe("purgeInputFileSystem", () => {
			it("invokes purge() if inputFileSystem.purge", done => {
				const mockPurge = jest.fn();
				compiler.inputFileSystem = {
					purge: mockPurge
				};
				compiler.purgeInputFileSystem();
				expect(mockPurge.mock.calls.length).toBe(1);
				done();
			});
			it("does NOT invoke purge() if !inputFileSystem.purge", done => {
				const mockPurge = jest.fn();
				compiler.inputFileSystem = null;
				compiler.purgeInputFileSystem();
				expect(mockPurge.mock.calls.length).toBe(0);
				done();
			});
		});
		describe("isChild", () => {
			it("returns booleanized this.parentCompilation", done => {
				compiler.parentCompilation = "stringyStringString";
				const response1 = compiler.isChild();
				expect(response1).toBe(true);

				compiler.parentCompilation = 123456789;
				const response2 = compiler.isChild();
				expect(response2).toBe(true);

				compiler.parentCompilation = {
					what: "I belong to an object"
				};
				const response3 = compiler.isChild();
				expect(response3).toBe(true);

				compiler.parentCompilation = ["Array", 123, true, null, [], () => {}];
				const response4 = compiler.isChild();
				expect(response4).toBe(true);

				compiler.parentCompilation = false;
				const response5 = compiler.isChild();
				expect(response5).toBe(false);

				compiler.parentCompilation = 0;
				const response6 = compiler.isChild();
				expect(response6).toBe(false);

				compiler.parentCompilation = null;
				const response7 = compiler.isChild();
				expect(response7).toBe(false);

				compiler.parentCompilation = "";
				const response8 = compiler.isChild();
				expect(response8).toBe(false);

				compiler.parentCompilation = NaN;
				const response9 = compiler.isChild();
				expect(response9).toBe(false);
				done();
			});
		});
	});
	it("should not emit on errors", done => {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./missing",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		compiler.run((err, stats) => {
			if (err) return done(err);
			if (compiler.outputFileSystem.existsSync("/bundle.js"))
				return done(new Error("Bundle should not be created on error"));
			done();
		});
	});
	it("should bubble up errors when wrapped in a promise and bail is true", async done => {
		try {
			const createCompiler = options => {
				return new Promise((resolve, reject) => {
					const c = webpack(options);
					c.run((err, stats) => {
						if (err) {
							reject(err);
						}
						if (stats !== undefined && "errors" in stats) {
							reject(err);
						} else {
							resolve(stats);
						}
					});
				});
			};
			const compiler = await createCompiler({
				context: __dirname,
				mode: "production",
				entry: "./missing-file",
				output: {
					path: "/directory",
					filename: "bundle.js"
				},
				bail: true
			});
			done();
			return compiler;
		} catch (err) {
			expect(err.toString()).toMatch(
				"ModuleNotFoundError: Module not found: Error: Can't resolve './missing-file'"
			);
			done();
		}
	});
	it("should not emit compilation errors in async (watch)", async done => {
		try {
			const createCompiler = options => {
				return new Promise((resolve, reject) => {
					const c = webpack(options);
					c.outputFileSystem = createFsFromVolume(new Volume());
					const watching = c.watch({}, (err, stats) => {
						watching.close(() => {
							if (err) return reject(err);
							resolve(stats);
						});
					});
				});
			};
			const compiler = await createCompiler({
				context: __dirname,
				mode: "production",
				entry: "./missing-file",
				output: {
					path: "/directory",
					filename: "bundle.js"
				}
			});
			expect(compiler).toBeInstanceOf(Stats);
			done();
		} catch (err) {
			done(err);
		}
	});

	it("should not emit on errors (watch)", done => {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./missing",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		const watching = compiler.watch({}, (err, stats) => {
			watching.close();
			if (err) return done(err);
			if (compiler.outputFileSystem.existsSync("/bundle.js"))
				return done(new Error("Bundle should not be created on error"));
			done();
		});
	});
	it("should not be running twice at a time (run)", done => {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		compiler.run((err, stats) => {
			if (err) return done(err);
		});
		compiler.run((err, stats) => {
			if (err) return done();
		});
	});
	it("should not be running twice at a time (watch)", done => {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		compiler.watch({}, (err, stats) => {
			if (err) return done(err);
		});
		compiler.watch({}, (err, stats) => {
			if (err) return done();
		});
	});
	it("should not be running twice at a time (run - watch)", done => {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		compiler.run((err, stats) => {
			if (err) return done(err);
		});
		compiler.watch({}, (err, stats) => {
			if (err) return done();
		});
	});
	it("should not be running twice at a time (watch - run)", done => {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		compiler.watch({}, (err, stats) => {
			if (err) return done(err);
		});
		compiler.run((err, stats) => {
			if (err) return done();
		});
	});
	it("should not be running twice at a time (instance cb)", done => {
		const compiler = webpack(
			{
				context: __dirname,
				mode: "production",
				entry: "./c",
				output: {
					path: "/directory",
					filename: "bundle.js"
				}
			},
			() => {}
		);
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		compiler.run((err, stats) => {
			if (err) return done();
		});
	});
	it("should run again correctly after first compilation", done => {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		compiler.run((err, stats) => {
			if (err) return done(err);

			compiler.run((err, stats) => {
				if (err) return done(err);
				done();
			});
		});
	});
	it("should watch again correctly after first compilation", done => {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		compiler.run((err, stats) => {
			if (err) return done(err);

			compiler.watch({}, (err, stats) => {
				if (err) return done(err);
				done();
			});
		});
	});
	it("should run again correctly after first closed watch", done => {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		const watching = compiler.watch({}, (err, stats) => {
			if (err) return done(err);
		});
		watching.close(() => {
			compiler.run((err, stats) => {
				if (err) return done(err);
				done();
			});
		});
	});
	it("should set compiler.watching correctly", function (done) {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		const watching = compiler.watch({}, (err, stats) => {
			if (err) return done(err);
			done();
		});
		expect(compiler.watching).toBe(watching);
	});
	it("should watch again correctly after first closed watch", done => {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		const watching = compiler.watch({}, (err, stats) => {
			if (err) return done(err);
		});
		watching.close(() => {
			compiler.watch({}, (err, stats) => {
				if (err) return done(err);
				done();
			});
		});
	});
	it("should run again correctly inside afterDone hook", done => {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		let once = true;
		compiler.hooks.afterDone.tap("RunAgainTest", () => {
			if (!once) return;
			once = false;
			compiler.run((err, stats) => {
				if (err) return done(err);
				done();
			});
		});
		compiler.run((err, stats) => {
			if (err) return done(err);
		});
	});
	it("should call afterDone hook after other callbacks (run)", done => {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		const runCb = jest.fn();
		const doneHookCb = jest.fn();
		compiler.hooks.done.tap("afterDoneRunTest", doneHookCb);
		compiler.hooks.afterDone.tap("afterDoneRunTest", () => {
			expect(runCb).toHaveBeenCalled();
			expect(doneHookCb).toHaveBeenCalled();
			done();
		});
		compiler.run((err, stats) => {
			if (err) return done(err);
			runCb();
		});
	});
	it("should call afterDone hook after other callbacks (instance cb)", done => {
		const instanceCb = jest.fn();
		const compiler = webpack(
			{
				context: __dirname,
				mode: "production",
				entry: "./c",
				output: {
					path: "/directory",
					filename: "bundle.js"
				}
			},
			(err, stats) => {
				if (err) return done(err);
				instanceCb();
			}
		);
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		const doneHookCb = jest.fn();
		compiler.hooks.done.tap("afterDoneRunTest", doneHookCb);
		compiler.hooks.afterDone.tap("afterDoneRunTest", () => {
			expect(instanceCb).toHaveBeenCalled();
			expect(doneHookCb).toHaveBeenCalled();
			done();
		});
	});
	it("should call afterDone hook after other callbacks (watch)", done => {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = createFsFromVolume(new Volume());
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
			done();
		});
		const watch = compiler.watch({}, (err, stats) => {
			if (err) return done(err);
			watchCb();
		});
		process.nextTick(() => {
			watch.invalidate(invalidateCb);
		});
	});
	it("should call afterDone hook after other callbacks (watch close)", done => {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = createFsFromVolume(new Volume());
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
		const watch = compiler.watch({}, (err, stats) => {
			if (err) return done(err);
			watch.close(watchCloseCb);
		});
		process.nextTick(() => {
			watch.invalidate(invalidateCb);
		});
	});
	it("should flag watchMode as true in watch", done => {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});

		compiler.outputFileSystem = createFsFromVolume(new Volume());

		const watch = compiler.watch({}, err => {
			if (err) return done(err);
			expect(compiler.watchMode).toBeTruthy();
			watch.close(() => {
				expect(compiler.watchMode).toBeFalsy();
				done();
			});
		});
	});
	it("should use cache on second run call", done => {
		const compiler = webpack({
			context: __dirname,
			mode: "development",
			devtool: false,
			entry: "./fixtures/count-loader!./fixtures/count-loader",
			output: {
				path: "/directory"
			}
		});
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		compiler.run(() => {
			compiler.run(() => {
				const result = compiler.outputFileSystem.readFileSync(
					"/directory/main.js",
					"utf-8"
				);
				expect(result).toContain("module.exports = 0;");
				done();
			});
		});
	});
	it("should call the failed-hook on error", done => {
		const failedSpy = jest.fn();
		const compiler = webpack({
			bail: true,
			context: __dirname,
			mode: "production",
			entry: "./missing",
			output: {
				path: "/directory",
				filename: "bundle.js"
			}
		});
		compiler.hooks.failed.tap("CompilerTest", failedSpy);
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		compiler.run((err, stats) => {
			expect(err).toBeTruthy();
			expect(failedSpy).toHaveBeenCalledTimes(1);
			expect(failedSpy).toHaveBeenCalledWith(err);
			done();
		});
	});
	it("should deprecate when watch option is used without callback", () => {
		const tracker = deprecationTracking.start();
		webpack({
			watch: true
		});
		const deprecations = tracker();
		expect(deprecations).toEqual([
			expect.objectContaining({
				code: "DEP_WEBPACK_WATCH_WITHOUT_CALLBACK"
			})
		]);
	});
	describe("infrastructure logging", () => {
		let capture;
		beforeEach(() => {
			capture = captureStdio(process.stderr);
		});
		afterEach(() => {
			capture.restore();
		});
		class MyPlugin {
			apply(compiler) {
				const logger = compiler.getInfrastructureLogger("MyPlugin");
				logger.time("Time");
				logger.group("Group");
				logger.error("Error");
				logger.warn("Warning");
				logger.info("Info");
				logger.log("Log");
				logger.debug("Debug");
				logger.groupCollapsed("Collaped group");
				logger.log("Log inside collapsed group");
				logger.groupEnd();
				logger.groupEnd();
				logger.timeEnd("Time");
			}
		}
		it("should log to the console (verbose)", done => {
			const compiler = webpack({
				context: path.join(__dirname, "fixtures"),
				entry: "./a",
				output: {
					path: "/directory",
					filename: "bundle.js"
				},
				infrastructureLogging: {
					level: "verbose"
				},
				plugins: [new MyPlugin()]
			});
			compiler.outputFileSystem = createFsFromVolume(new Volume());
			compiler.run((err, stats) => {
				expect(capture.toString().replace(/[\d.]+ ms/, "X ms"))
					.toMatchInlineSnapshot(`
"<-> [MyPlugin] Group
  <e> [MyPlugin] Error
  <w> [MyPlugin] Warning
  <i> [MyPlugin] Info
      [MyPlugin] Log
  <-> [MyPlugin] Collaped group
        [MyPlugin] Log inside collapsed group
<t> [MyPlugin] Time: X ms
"
`);
				done();
			});
		});
		it("should log to the console (debug mode)", done => {
			const compiler = webpack({
				context: path.join(__dirname, "fixtures"),
				entry: "./a",
				output: {
					path: "/directory",
					filename: "bundle.js"
				},
				infrastructureLogging: {
					level: "error",
					debug: /MyPlugin/
				},
				plugins: [new MyPlugin()]
			});
			compiler.outputFileSystem = createFsFromVolume(new Volume());
			compiler.run((err, stats) => {
				expect(capture.toString().replace(/[\d.]+ ms/, "X ms"))
					.toMatchInlineSnapshot(`
"<-> [MyPlugin] Group
  <e> [MyPlugin] Error
  <w> [MyPlugin] Warning
  <i> [MyPlugin] Info
      [MyPlugin] Log
      [MyPlugin] Debug
  <-> [MyPlugin] Collaped group
        [MyPlugin] Log inside collapsed group
<t> [MyPlugin] Time: X ms
"
`);
				done();
			});
		});
		it("should log to the console (none)", done => {
			const compiler = webpack({
				context: path.join(__dirname, "fixtures"),
				entry: "./a",
				output: {
					path: "/directory",
					filename: "bundle.js"
				},
				infrastructureLogging: {
					level: "none"
				},
				plugins: [new MyPlugin()]
			});
			compiler.outputFileSystem = createFsFromVolume(new Volume());
			compiler.run((err, stats) => {
				expect(capture.toString()).toMatchInlineSnapshot(`""`);
				done();
			});
		});
	});
});
