/* globals describe, it */
"use strict";

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
			join() {
				return [].join.call(arguments, "/").replace(/\/+/g, "/");
			},
			mkdirp(path, callback) {
				logs.mkdirp.push(path);
				callback();
			},
			writeFile(name, content, callback) {
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
				expect(stats.logs.mkdirp).toEqual(["/what", "/what/the"]);
				done();
			}
		);
	});

	it("should compile a single file", done => {
		compile("./c", {}, (stats, files) => {
			expect(Object.keys(files)).toEqual(["/main.js"]);
			const bundle = files["/main.js"];
			expect(bundle).toMatch("function __webpack_require__(");
			expect(bundle).toMatch("__webpack_require__(/*! ./a */ 0);");
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
			expect(Object.keys(files)).toEqual(["/0.js", "/main.js"]);
			const bundle = files["/main.js"];
			const chunk = files["/0.js"];
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
			expect(bundle).toMatch("webpackJsonp");
			expect(chunk).toMatch('window["webpackJsonp"] || []).push');
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
				expect(mockPurge.callCount).toBe(1);
				done();
			});
			it("does NOT invoke purge() if !inputFileSystem.purge", done => {
				const mockPurge = sinon.spy();
				compiler.inputFileSystem = null;
				compiler.purgeInputFileSystem();
				expect(mockPurge.callCount).toBe(0);
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
	it("should not emit on errors (watch)", done => {
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
	it("should not be run twice at a time (run)", function(done) {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = new MemoryFs();
		compiler.run((err, stats) => {
			if (err) return done(err);
		});
		compiler.run((err, stats) => {
			if (err) return done();
		});
	});
	it("should not be run twice at a time (watch)", function(done) {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = new MemoryFs();
		compiler.watch({}, (err, stats) => {
			if (err) return done(err);
		});
		compiler.watch({}, (err, stats) => {
			if (err) return done();
		});
	});
	it("should not be run twice at a time (run - watch)", function(done) {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = new MemoryFs();
		compiler.run((err, stats) => {
			if (err) return done(err);
		});
		compiler.watch({}, (err, stats) => {
			if (err) return done();
		});
	});
	it("should not be run twice at a time (watch - run)", function(done) {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = new MemoryFs();
		compiler.watch({}, (err, stats) => {
			if (err) return done(err);
		});
		compiler.run((err, stats) => {
			if (err) return done();
		});
	});
	it("should not be run twice at a time (instance cb)", function(done) {
		const compiler = webpack(
			{
				context: __dirname,
				mode: "production",
				entry: "./c",
				output: {
					path: "/",
					filename: "bundle.js"
				}
			},
			() => {}
		);
		compiler.outputFileSystem = new MemoryFs();
		compiler.run((err, stats) => {
			if (err) return done();
		});
	});
	it("should run again correctly after first compilation", function(done) {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = new MemoryFs();
		compiler.run((err, stats) => {
			if (err) return done(err);

			compiler.run((err, stats) => {
				if (err) return done(err);
				done();
			});
		});
	});
	it("should watch again correctly after first compilation", function(done) {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = new MemoryFs();
		compiler.run((err, stats) => {
			if (err) return done(err);

			compiler.watch({}, (err, stats) => {
				if (err) return done(err);
				done();
			});
		});
	});
	it("should run again correctly after first closed watch", function(done) {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = new MemoryFs();
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
	it("should watch again correctly after first closed watch", function(done) {
		const compiler = webpack({
			context: __dirname,
			mode: "production",
			entry: "./c",
			output: {
				path: "/",
				filename: "bundle.js"
			}
		});
		compiler.outputFileSystem = new MemoryFs();
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
});
