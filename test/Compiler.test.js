/* globals describe, it */
"use strict";

const path = require("path");

const webpack = require("../");
const WebpackOptionsDefaulter = require("../lib/WebpackOptionsDefaulter");

describe("Compiler", () => {
	function compile(entry, options, callback) {
		const noOutputPath = !options.output || !options.output.path;
		new WebpackOptionsDefaulter().process(options);
		options.entry = entry;
		options.context = path.join(__dirname, "fixtures");
		if(noOutputPath) options.output.path = "/";
		options.output.pathinfo = true;
		const logs = {
			mkdirp: [],
			writeFile: [],
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
		c.plugin("compilation", (compilation) => compilation.bail = true);
		c.run((err, stats) => {
			if(err) throw err;
			expect(typeof stats).toBe("object");
			const compilation = stats.compilation;
			stats = stats.toJson({
				modules: true,
				reasons: true
			});
			expect(typeof stats).toBe("object");
			expect(stats).toHaveProperty("errors");
			expect(Array.isArray(stats.errors)).toBeTruthy();
			if(stats.errors.length > 0) {
				expect(stats.errors[0]).toBeInstanceOf(Error);
				throw stats.errors[0];
			}
			stats.logs = logs;
			callback(stats, files, compilation);
		});
	}

	it("should compile a single file to deep output", (done) => {
		compile("./c", {
			output: {
				path: "/what",
				filename: "the/hell.js",
			}
		}, (stats, files) => {
			expect(stats.logs.mkdirp).toEqual([
				"/what",
				"/what/the",
			]);
			done();
		});
	});

	it("should compile a single file", (done) => {
		compile("./c", {}, (stats, files) => {
			expect(typeof files['/main.js']).toBe('string');
			expect(Object.keys(files)).toEqual(["/main.js"]);
			const bundle = files["/main.js"];
			expect(bundle).toContain("function __webpack_require__(");
			expect(bundle).toContain("__webpack_require__(/*! ./a */ 0);");
			expect(bundle).toContain("./c.js");
			expect(bundle).toContain("./a.js");
			expect(bundle).toContain("This is a");
			expect(bundle).toContain("This is c");
			expect(bundle).not.toContain("2: function(");
			expect(bundle).not.toContain("window");
			expect(bundle).not.toContain("jsonp");
			expect(bundle).not.toContain("fixtures");
			done();
		});
	});

	it("should compile a complex file", (done) => {
		compile("./main1", {}, (stats, files) => {
			expect(typeof files['/main.js']).toBe('string');
			expect(Object.keys(files)).toEqual(["/main.js"]);
			const bundle = files["/main.js"];
			expect(bundle).toContain("function __webpack_require__(");
			expect(bundle).toContain("__webpack_require__(/*! ./a */");
			expect(bundle).toContain("./main1.js");
			expect(bundle).toContain("./a.js");
			expect(bundle).toContain("./b.js");
			expect(bundle).toContain("./~/m1/a.js");
			expect(bundle).toContain("This is a");
			expect(bundle).toContain("This is b");
			expect(bundle).toContain("This is m1/a");
			expect(bundle).not.toContain("4: function(");
			expect(bundle).not.toContain("window");
			expect(bundle).not.toContain("jsonp");
			expect(bundle).not.toContain("fixtures");
			done();
		});
	});

	it("should compile a file with transitive dependencies", (done) => {
		compile("./abc", {}, (stats, files) => {
			expect(typeof files['/main.js']).toBe('string');
			expect(Object.keys(files)).toEqual(["/main.js"]);
			const bundle = files["/main.js"];
			expect(bundle).toContain("function __webpack_require__(");
			expect(bundle).toContain("__webpack_require__(/*! ./a */");
			expect(bundle).toContain("__webpack_require__(/*! ./b */");
			expect(bundle).toContain("__webpack_require__(/*! ./c */");
			expect(bundle).toContain("./abc.js");
			expect(bundle).toContain("./a.js");
			expect(bundle).toContain("./b.js");
			expect(bundle).toContain("./c.js");
			expect(bundle).toContain("This is a");
			expect(bundle).toContain("This is b");
			expect(bundle).toContain("This is c");
			expect(bundle).not.toContain("4: function(");
			expect(bundle).not.toContain("window");
			expect(bundle).not.toContain("jsonp");
			expect(bundle).not.toContain("fixtures");
			done();
		});
	});

	it("should compile a file with multiple chunks", (done) => {
		compile("./chunks", {}, (stats, files) => {
			expect(stats.chunks.length).toEqual(2);
			expect(typeof files['/main.js']).toBe('string');
			expect(typeof files['/0.js']).toBe('string');
			expect(Object.keys(files)).toEqual(["/0.js", "/main.js"]);
			const bundle = files["/main.js"];
			const chunk = files["/0.js"];
			expect(bundle).toContain("function __webpack_require__(");
			expect(bundle).toContain("__webpack_require__(/*! ./b */");
			expect(chunk).not.toContain("__webpack_require__(/* ./b */");
			expect(bundle).toContain("./chunks.js");
			expect(chunk).toContain("./a.js");
			expect(chunk).toContain("./b.js");
			expect(chunk).toContain("This is a");
			expect(bundle).not.toContain("This is a");
			expect(chunk).toContain("This is b");
			expect(bundle).not.toContain("This is b");
			expect(bundle).not.toContain("4: function(");
			expect(bundle).not.toContain("fixtures");
			expect(chunk).not.toContain("fixtures");
			expect(bundle).toContain("webpackJsonp");
			expect(chunk).toContain("webpackJsonp(");
			done();
		});
	});
});
