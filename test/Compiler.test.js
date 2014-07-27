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
	it("should compile a complex file", function(done) {
		compile("./main1", {}, function(stats, files) {
			files.should.have.property("bundle.js").have.type("string");
			Object.keys(files).should.be.eql(["bundle.js"]);
			var bundle = files["bundle.js"];
			bundle.should.containEql("function __webpack_require__(");
			bundle.should.containEql("__webpack_require__(/*! ./a */");
			bundle.should.containEql("./main1.js");
			bundle.should.containEql("./a.js");
			bundle.should.containEql("./b.js");
			bundle.should.containEql("./~/m1/a.js");
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
	it("should compile a file with transitive dependencies", function(done) {
		compile("./abc", {}, function(stats, files) {
			files.should.have.property("bundle.js").have.type("string");
			Object.keys(files).should.be.eql(["bundle.js"]);
			var bundle = files["bundle.js"];
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
	it("should compile a file with multiple chunks", function(done) {
		compile("./chunks", {}, function(stats, files) {
			stats.chunks.length.should.be.eql(2);
			files.should.have.property("bundle.js").have.type("string");
			files.should.have.property("1.bundle.js").have.type("string");
			Object.keys(files).should.be.eql(["bundle.js", "1.bundle.js"]);
			var bundle = files["bundle.js"];
			var chunk = files["1.bundle.js"];
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