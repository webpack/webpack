/* globals describe, it */
"use strict";

const should = require("should");
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
			should.strictEqual(typeof stats, "object");
			const compilation = stats.compilation;
			stats = stats.toJson({
				modules: true,
				reasons: true
			});
			should.strictEqual(typeof stats, "object");
			stats.should.have.property("errors");
			Array.isArray(stats.errors).should.be.ok();
			if(stats.errors.length > 0) {
				stats.errors[0].should.be.instanceOf(Error);
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
			stats.logs.mkdirp.should.eql([
				"/what",
				"/what/the",
			]);
			done();
		});
	});

	it("should compile a single file", (done) => {
		compile("./c", {}, (stats, files) => {
			files.should.have.property("/main.js").have.type("string");
			Object.keys(files).should.be.eql(["/main.js"]);
			const bundle = files["/main.js"];
			bundle.should.containEql("function __webpack_require__(");
			bundle.should.containEql("__webpack_require__(/*! ./a */ 1);");
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

	it("should compile a complex file", (done) => {
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

	it("should compile a file with transitive dependencies", (done) => {
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

	it("should compile a file with multiple chunks", (done) => {
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
			chunk.should.containEql("webpackJsonp(");
			done();
		});
	});
});
