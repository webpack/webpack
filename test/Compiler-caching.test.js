/* globals describe, it, before, after */
"use strict";

const should = require("should");
const path = require("path");
const fs = require("fs");

const webpack = require("../");
const WebpackOptionsDefaulter = require("../lib/WebpackOptionsDefaulter");

describe("Compiler (caching)", function() {
	this.timeout(15000);

	function compile(entry, options, callback) {
		options.mode = "none";
		options = new WebpackOptionsDefaulter().process(options);
		options.cache = true;
		options.entry = entry;
		options.optimization.minimize = false;
		options.context = path.join(__dirname, "fixtures");
		options.output.path = "/";
		options.output.filename = "bundle.js";
		options.output.pathinfo = true;
		const logs = {
			mkdirp: [],
			writeFile: []
		};

		const c = webpack(options);
		const files = {};
		c.outputFileSystem = {
			join: function() {
				return [].join.call(arguments, "/").replace(/\/+/g, "/");
			},
			mkdirp: function(path, callback) {
				logs.mkdirp.push(path);
				callback();
			},
			writeFile: function(name, content, callback) {
				logs.writeFile.push(name, content);
				files[name] = content.toString("utf-8");
				callback();
			}
		};
		c.hooks.compilation.tap(
			"CompilerCachingTest",
			compilation => (compilation.bail = true)
		);

		let compilerIteration = 1;

		function runCompiler(options, callback) {
			if (typeof options === "function") {
				callback = options;
				options = {};
			}
			c.run((err, stats) => {
				if (err) throw err;
				should.strictEqual(typeof stats, "object");
				stats = stats.toJson({
					modules: true,
					reasons: true
				});
				should.strictEqual(typeof stats, "object");
				stats.should.have.property("errors");
				Array.isArray(stats.errors).should.be.ok();
				if (options.expectErrors) {
					stats.errors.length.should.be.eql(options.expectErrors);
				} else {
					if (stats.errors.length > 0) {
						stats.errors[0].should.be.type("string");
						throw new Error(stats.errors[0]);
					}
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
	const aFilepath = path.join(tempFixturePath, "a.js");
	const cFilepath = path.join(tempFixturePath, "c.js");

	function cleanup() {
		function ignoreENOENT(fn) {
			try {
				return fn();
			} catch (e) {
				if (e.code !== "ENOENT") {
					throw e;
				}
			}
		}
		ignoreENOENT(() => fs.unlinkSync(aFilepath));
		ignoreENOENT(() => fs.unlinkSync(cFilepath));
		ignoreENOENT(() => fs.rmdirSync(tempFixturePath));
	}
	before(cleanup);
	after(cleanup);

	function createTempFixture() {
		// Remove previous copy if present
		try {
			if (fs.statSync(tempFixturePath)) {
				fs.unlinkSync(aFilepath);
				fs.unlinkSync(cFilepath);
				fs.rmdirSync(tempFixturePath);
			}
		} catch (e) {
			if (e.code !== "ENOENT") {
				throw e;
			}
		}

		// Copy over file since we"ll be modifying some of them
		fs.mkdirSync(tempFixturePath);
		fs
			.createReadStream(path.join(__dirname, "fixtures", "a.js"))
			.pipe(fs.createWriteStream(aFilepath));
		fs
			.createReadStream(path.join(__dirname, "fixtures", "c.js"))
			.pipe(fs.createWriteStream(cFilepath));

		return {
			rootPath: tempFixturePath,
			aFilepath: aFilepath,
			cFilepath: cFilepath
		};
	}

	it("should cache single file (with manual 1s wait) ", done => {
		const options = {};
		const tempFixture = createTempFixture();

		const helper = compile(
			"./temp-cache-fixture/c",
			options,
			(stats, files) => {
				// Not cached the first time
				stats.assets[0].name.should.be.exactly("bundle.js");
				stats.assets[0].emitted.should.be.exactly(true);

				helper.runAgain((stats, files, iteration) => {
					// Cached the second run
					stats.assets[0].name.should.be.exactly("bundle.js");
					stats.assets[0].emitted.should.be.exactly(false);

					const aContent = fs
						.readFileSync(tempFixture.aFilepath)
						.toString()
						.replace("This is a", "This is a MODIFIED");

					setTimeout(() => {
						fs.writeFileSync(tempFixture.aFilepath, aContent);

						helper.runAgain((stats, files, iteration) => {
							// Cached the third run
							stats.assets[0].name.should.be.exactly("bundle.js");
							stats.assets[0].emitted.should.be.exactly(true);

							done();
						});
					}, 1100);
				});
			}
		);
	});

	it("should cache single file (even with no timeout) ", done => {
		const options = {};
		const tempFixture = createTempFixture();

		const helper = compile(
			"./temp-cache-fixture/c",
			options,
			(stats, files) => {
				// Not cached the first time
				stats.assets[0].name.should.be.exactly("bundle.js");
				stats.assets[0].emitted.should.be.exactly(true);

				helper.runAgain((stats, files, iteration) => {
					// Cached the second run
					stats.assets[0].name.should.be.exactly("bundle.js");
					stats.assets[0].emitted.should.be.exactly(false);

					files["/bundle.js"].should.containEql("This is a");

					const aContent = fs
						.readFileSync(tempFixture.aFilepath)
						.toString()
						.replace("This is a", "This is a MODIFIED");

					fs.writeFileSync(tempFixture.aFilepath, aContent);

					helper.runAgain((stats, files, iteration) => {
						// Cached the third run
						stats.assets[0].name.should.be.exactly("bundle.js");
						stats.assets[0].emitted.should.be.exactly(true);

						files["/bundle.js"].should.containEql("This is a MODIFIED");

						done();
					});
				});
			}
		);
	});

	it("should only build when modified (with manual 2s wait)", done => {
		const options = {};
		const tempFixture = createTempFixture();

		const helper = compile(
			"./temp-cache-fixture/c",
			options,
			(stats, files) => {
				// Built the first time
				stats.modules[0].name.should.containEql("c.js");
				stats.modules[0].built.should.be.exactly(
					true,
					"c.js should have been built"
				);

				stats.modules[1].name.should.containEql("a.js");
				stats.modules[1].built.should.be.exactly(
					true,
					"a.js should have been built"
				);

				setTimeout(() => {
					helper.runAgain((stats, files, iteration) => {
						// Not built when cached the second run
						stats.modules[0].name.should.containEql("c.js");
						//stats.modules[0].built.should.be.exactly(false, "c.js should not have built");

						stats.modules[1].name.should.containEql("a.js");
						//stats.modules[1].built.should.be.exactly(false, "a.js should not have built");

						const aContent = fs
							.readFileSync(tempFixture.aFilepath)
							.toString()
							.replace("This is a", "This is a MODIFIED");

						setTimeout(() => {
							fs.writeFileSync(tempFixture.aFilepath, aContent);

							helper.runAgain((stats, files, iteration) => {
								// And only a.js built after it was modified
								stats.modules[0].name.should.containEql("c.js");
								stats.modules[0].built.should.be.exactly(
									false,
									"c.js should not have built"
								);

								stats.modules[1].name.should.containEql("a.js");
								stats.modules[1].built.should.be.exactly(
									true,
									"a.js should have been built"
								);

								done();
							});
						}, 2100);
					});
				}, 4100);
			}
		);
	});

	it("should build when modified (even with no timeout)", done => {
		const options = {};
		const tempFixture = createTempFixture();

		const helper = compile(
			"./temp-cache-fixture/c",
			options,
			(stats, files) => {
				// Built the first time
				stats.modules[0].name.should.containEql("c.js");
				stats.modules[0].built.should.be.exactly(
					true,
					"c.js should have been built"
				);

				stats.modules[1].name.should.containEql("a.js");
				stats.modules[1].built.should.be.exactly(
					true,
					"a.js should have been built"
				);

				helper.runAgain((stats, files, iteration) => {
					// Not built when cached the second run
					stats.modules[0].name.should.containEql("c.js");
					//stats.modules[0].built.should.be.exactly(false, "c.js should not have built");

					stats.modules[1].name.should.containEql("a.js");
					//stats.modules[1].built.should.be.exactly(false, "a.js should not have built");

					const aContent = fs
						.readFileSync(tempFixture.aFilepath)
						.toString()
						.replace("This is a", "This is a MODIFIED");

					fs.writeFileSync(tempFixture.aFilepath, aContent);

					helper.runAgain((stats, files, iteration) => {
						// And only a.js built after it was modified
						stats.modules[0].name.should.containEql("c.js");
						//stats.modules[0].built.should.be.exactly(false, "c.js should not have built");

						stats.modules[1].name.should.containEql("a.js");
						stats.modules[1].built.should.be.exactly(
							true,
							"a.js should have been built"
						);

						done();
					});
				});
			}
		);
	});
});
