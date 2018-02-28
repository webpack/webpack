/* globals describe, it */
"use strict";

const should = require("should");
const path = require("path");
const sinon = require("sinon");

const webpack = require("../");
const WebpackOptionsDefaulter = require("../lib/WebpackOptionsDefaulter");
const MemoryFs = require("memory-fs");

describe("Compiler", () => {
	function compile(entry, options, callback) {
		const noOutputPath = !options.output || !options.output.path;
		if (!options.mode) options.mode = "production";
		options = new WebpackOptionsDefaulter().process(options);
		options.entry = entry;
		options.context = path.join(__dirname, "fixtures");
		if (noOutputPath) options.output.path = "/";
		options.output.pathinfo = true;
		options.optimization = {
			minimize: false
		};
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
			"CompilerTest",
			compilation => (compilation.bail = true)
		);
		c.run((err, stats) => {
			if (err) throw err;
			should.strictEqual(typeof stats, "object");
			const compilation = stats.compilation;
			stats = stats.toJson({
				modules: true,
				reasons: true
			});
			should.strictEqual(typeof stats, "object");
			stats.should.have.property("errors");
			Array.isArray(stats.errors).should.be.ok();
			if (stats.errors.length > 0) {
				stats.errors[0].should.be.instanceOf(Error);
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
				stats.logs.mkdirp.should.eql(["/what", "/what/the"]);
				done();
			}
		);
	});

	it("should compile a single file", done => {
		compile("./c", {}, (stats, files) => {
			files.should.have.property("/main.js").have.type("string");
			Object.keys(files).should.be.eql(["/main.js"]);
			const bundle = files["/main.js"];
			bundle.should.containEql("function __webpack_require__(");
			bundle.should.containEql("__webpack_require__(/*! ./a */ 0);");
			bundle.should.containEql("./c.js");
			bundle.should.containEql("./a.js");
			bundle.should.containEql("This is a");
			bundle.should.containEql("This is c");
			bundle.should.not.containEql("2: function(");
			bundle.should.not.containEql("window");
			bundle.should.not.containEql("jsonp");
			bundle.should.not.containEql("fixtures");
			done();
		});
	});

	it("should compile a complex file", done => {
		compile("./main1", {}, (stats, files) => {
			files.should.have.property("/main.js").have.type("string");
			Object.keys(files).should.be.eql(["/main.js"]);
			const bundle = files["/main.js"];
			bundle.should.containEql("function __webpack_require__(");
			bundle.should.containEql("__webpack_require__(/*! ./a */");
			bundle.should.containEql("./main1.js");
			bundle.should.containEql("./a.js");
			bundle.should.containEql("./b.js");
			bundle.should.containEql("./node_modules/m1/a.js");
			bundle.should.containEql("This is a");
			bundle.should.containEql("This is b");
			bundle.should.containEql("This is m1/a");
			bundle.should.not.containEql("4: function(");
			bundle.should.not.containEql("window");
			bundle.should.not.containEql("jsonp");
			bundle.should.not.containEql("fixtures");
			done();
		});
	});

	it("should compile a file with transitive dependencies", done => {
		compile("./abc", {}, (stats, files) => {
			files.should.have.property("/main.js").have.type("string");
			Object.keys(files).should.be.eql(["/main.js"]);
			const bundle = files["/main.js"];
			bundle.should.containEql("function __webpack_require__(");
			bundle.should.containEql("__webpack_require__(/*! ./a */");
			bundle.should.containEql("__webpack_require__(/*! ./b */");
			bundle.should.containEql("__webpack_require__(/*! ./c */");
			bundle.should.containEql("./abc.js");
			bundle.should.containEql("./a.js");
			bundle.should.containEql("./b.js");
			bundle.should.containEql("./c.js");
			bundle.should.containEql("This is a");
			bundle.should.containEql("This is b");
			bundle.should.containEql("This is c");
			bundle.should.not.containEql("4: function(");
			bundle.should.not.containEql("window");
			bundle.should.not.containEql("jsonp");
			bundle.should.not.containEql("fixtures");
			done();
		});
	});

	it("should compile a file with multiple chunks", done => {
		compile("./chunks", {}, (stats, files) => {
			stats.chunks.length.should.be.eql(2);
			files.should.have.property("/main.js").have.type("string");
			files.should.have.property("/0.js").have.type("string");
			Object.keys(files).should.be.eql(["/0.js", "/main.js"]);
			const bundle = files["/main.js"];
			const chunk = files["/0.js"];
			bundle.should.containEql("function __webpack_require__(");
			bundle.should.containEql("__webpack_require__(/*! ./b */");
			chunk.should.not.containEql("__webpack_require__(/* ./b */");
			bundle.should.containEql("./chunks.js");
			chunk.should.containEql("./a.js");
			chunk.should.containEql("./b.js");
			chunk.should.containEql("This is a");
			bundle.should.not.containEql("This is a");
			chunk.should.containEql("This is b");
			bundle.should.not.containEql("This is b");
			bundle.should.not.containEql("4: function(");
			bundle.should.not.containEql("fixtures");
			chunk.should.not.containEql("fixtures");
			bundle.should.containEql("webpackJsonp");
			chunk.should.containEql('window["webpackJsonp"] || []).push');
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
					path: "/",
					pathinfo: true
				}
			});
		});
		describe("purgeInputFileSystem", () => {
			it("invokes purge() if inputFileSystem.purge", done => {
				const mockPurge = sinon.spy();
				compiler.inputFileSystem = {
					purge: mockPurge
				};
				compiler.purgeInputFileSystem();
				mockPurge.callCount.should.be.exactly(1);
				done();
			});
			it("does NOT invoke purge() if !inputFileSystem.purge", done => {
				const mockPurge = sinon.spy();
				compiler.inputFileSystem = null;
				compiler.purgeInputFileSystem();
				mockPurge.callCount.should.be.exactly(0);
				done();
			});
		});
		describe("isChild", () => {
			it("returns booleanized this.parentCompilation", done => {
				compiler.parentCompilation = "stringyStringString";
				const response1 = compiler.isChild();
				response1.should.be.exactly(true);

				compiler.parentCompilation = 123456789;
				const response2 = compiler.isChild();
				response2.should.be.exactly(true);

				compiler.parentCompilation = {
					what: "I belong to an object"
				};
				const response3 = compiler.isChild();
				response3.should.be.exactly(true);

				compiler.parentCompilation = ["Array", 123, true, null, [], () => {}];
				const response4 = compiler.isChild();
				response4.should.be.exactly(true);

				compiler.parentCompilation = false;
				const response5 = compiler.isChild();
				response5.should.be.exactly(false);

				compiler.parentCompilation = 0;
				const response6 = compiler.isChild();
				response6.should.be.exactly(false);

				compiler.parentCompilation = null;
				const response7 = compiler.isChild();
				response7.should.be.exactly(false);

				compiler.parentCompilation = "";
				const response8 = compiler.isChild();
				response8.should.be.exactly(false);

				compiler.parentCompilation = NaN;
				const response9 = compiler.isChild();
				response9.should.be.exactly(false);
				done();
			});
		});
	});
	it("should not emit on errors", function(done) {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./missing",
			output: {
				path: "/",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = new MemoryFs();
		compiler.run((err, stats) => {
			if (err) return done(err);
			if (compiler.outputFileSystem.existsSync("/bundle.js"))
				return done(new Error("Bundle should not be created on error"));
			done();
		});
	});
	it("should not emit on errors (watch)", function(done) {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./missing",
			output: {
				path: "/",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = new MemoryFs();
		const watching = compiler.watch({}, (err, stats) => {
			watching.close();
			if (err) return done(err);
			if (compiler.outputFileSystem.existsSync("/bundle.js"))
				return done(new Error("Bundle should not be created on error"));
			done();
		});
	});
});
