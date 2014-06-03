var should = require("should");
var path = require("path");

var NodeEnvironmentPlugin = require("../lib/node/NodeEnvironmentPlugin");
var Compiler = require("../lib/Compiler");
var WebpackOptionsApply = require("../lib/WebpackOptionsApply");
var WebpackOptionsDefaulter = require("../lib/WebpackOptionsDefaulter");

describe("Compiler", function() {
	function compile(entry, options, callback) {
		new WebpackOptionsDefaulter().process(options);
		options.entry = entry;
		options.context = path.join(__dirname, "fixtures");
		options.output.pathinfo = true;

		var c = new Compiler();
		c.options = new WebpackOptionsApply().process(options, c);
		new NodeEnvironmentPlugin().apply(c);
		var files = {};
		c.outputFileSystem = {
			join: path.join.bind(path),
			mkdirp: function(path, callback) {
				callback();
			},
			writeFile: function(name, content, callback) {
				files[name] = content.toString("utf-8");
				callback();
			}
		};
		c.plugin("compilation", function(compilation) {
			compilation.bail = true;
		});
		c.run(function(err, stats) {
			if(err) throw err;
			should.strictEqual(typeof stats, "object");
			stats = stats.toJson({
				modules: true,
				reasons: true
			});
			should.strictEqual(typeof stats, "object");
			stats.should.have.property("errors");
			Array.isArray(stats.errors).should.be.ok;
			if(stats.errors.length > 0) {
				stats.errors[0].should.be.instanceOf(Error);
				throw stats.errors[0];
			}
			callback(stats, files);
		});
	}
	it("should compile a single file", function(done) {
		compile("./c", {}, function(stats, files) {
			files.should.have.property("bundle.js").have.type("string");
			Object.keys(files).should.be.eql(["bundle.js"]);
			var bundle = files["bundle.js"];
			bundle.should.include("function __webpack_require__(");
			bundle.should.include("__webpack_require__(/*! ./a */ 1);");
			bundle.should.include("./c.js");
			bundle.should.include("./a.js");
			bundle.should.include("This is a");
			bundle.should.include("This is c");
			bundle.should.not.include("2: function(");
			bundle.should.not.include("window");
			bundle.should.not.include("jsonp");
			bundle.should.not.include("fixtures");
			done();
		});
	});
	it("should compile a complex file", function(done) {
		compile("./main1", {}, function(stats, files) {
			files.should.have.property("bundle.js").have.type("string");
			Object.keys(files).should.be.eql(["bundle.js"]);
			var bundle = files["bundle.js"];
			bundle.should.include("function __webpack_require__(");
			bundle.should.include("__webpack_require__(/*! ./a */");
			bundle.should.include("./main1.js");
			bundle.should.include("./a.js");
			bundle.should.include("./b.js");
			bundle.should.include("./~/m1/a.js");
			bundle.should.include("This is a");
			bundle.should.include("This is b");
			bundle.should.include("This is m1/a");
			bundle.should.not.include("4: function(");
			bundle.should.not.include("window");
			bundle.should.not.include("jsonp");
			bundle.should.not.include("fixtures");
			done();
		});
	});
	it("should compile a file with transitive dependencies", function(done) {
		compile("./abc", {}, function(stats, files) {
			files.should.have.property("bundle.js").have.type("string");
			Object.keys(files).should.be.eql(["bundle.js"]);
			var bundle = files["bundle.js"];
			bundle.should.include("function __webpack_require__(");
			bundle.should.include("__webpack_require__(/*! ./a */");
			bundle.should.include("__webpack_require__(/*! ./b */");
			bundle.should.include("__webpack_require__(/*! ./c */");
			bundle.should.include("./abc.js");
			bundle.should.include("./a.js");
			bundle.should.include("./b.js");
			bundle.should.include("./c.js");
			bundle.should.include("This is a");
			bundle.should.include("This is b");
			bundle.should.include("This is c");
			bundle.should.not.include("4: function(");
			bundle.should.not.include("window");
			bundle.should.not.include("jsonp");
			bundle.should.not.include("fixtures");
			done();
		});
	});
	it("should compile a file with multiple chunks", function(done) {
		compile("./chunks", {}, function(stats, files) {
			stats.chunks.length.should.be.eql(2);
			files.should.have.property("bundle.js").have.type("string");
			files.should.have.property("1.bundle.js").have.type("string");
			Object.keys(files).should.be.eql(["bundle.js", "1.bundle.js"]);
			var bundle = files["bundle.js"];
			var chunk = files["1.bundle.js"];
			bundle.should.include("function __webpack_require__(");
			bundle.should.include("__webpack_require__(/*! ./b */");
			chunk.should.not.include("__webpack_require__(/* ./b */");
			bundle.should.include("./chunks.js");
			chunk.should.include("./a.js");
			chunk.should.include("./b.js");
			chunk.should.include("This is a");
			bundle.should.not.include("This is a");
			chunk.should.include("This is b");
			bundle.should.not.include("This is b");
			bundle.should.not.include("4: function(");
			bundle.should.not.include("fixtures");
			chunk.should.not.include("fixtures");
			bundle.should.include("webpackJsonp");
			chunk.should.include("webpackJsonp(");
			done();
		});
	});
});