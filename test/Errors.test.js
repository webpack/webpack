var should = require("should");
var path = require("path");

var webpack = require("../lib/webpack");

var base = path.join(__dirname, "fixtures", "errors");

describe("Errors", function() {
	function getErrors(options, callback) {
		options.context = base;
		var c = webpack(options);
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
		c.run(function(err, stats) {
			if(err) throw err;
			should.strictEqual(typeof stats, "object");
			stats = stats.toJson({ errorDetails: false });
			should.strictEqual(typeof stats, "object");
			stats.should.have.property("errors");
			stats.should.have.property("warnings");
			Array.isArray(stats.errors).should.be.ok;
			Array.isArray(stats.warnings).should.be.ok;
			callback(stats.errors, stats.warnings);
		});
	}
	it("should throw an error if file doesn't exist", function(done) {
		getErrors({
			entry: "./missingFile"
		}, function(errors, warnings) {
			errors.length.should.be.eql(2);
			warnings.length.should.be.eql(0);
			var lines = errors[0].split("\n");
			lines[0].should.match(/missingFile.js/);
			lines[1].should.match(/^Module not found/);
			lines[1].should.match(/\.\/missing/);
			lines[2].should.match(/missingFile.js 4:0/);
			var lines = errors[1].split("\n");
			lines[0].should.match(/missingFile.js/);
			lines[1].should.match(/^Module not found/);
			lines[1].should.match(/\.\/dir\/missing2/);
			lines[2].should.match(/missingFile.js 12:9/);
			done();
		});
	});
	it("should report require.extensions as unsupported", function(done) {
		getErrors({
			entry: "./require.extensions"
		}, function(errors, warnings) {
			errors.length.should.be.eql(0);
			warnings.length.should.be.eql(1);
			var lines = warnings[0].split("\n");
			lines[0].should.match(/require.extensions\.js/);
			lines[1].should.match(/require.extensions is not supported by webpack/);
			done();
		});
	});
	it("should throw an error if you try to require an entry point", function(done) {
		getErrors({
			entry: {
				a: "./require-entry-point",
				b: "./entry-point",
				c: ["./entry-point2"]
			}
		}, function(errors, warnings) {
			errors.length.should.be.eql(2);
			warnings.length.should.be.eql(0);
			var lines = errors[0].split("\n");
			lines[0].should.match(/require-entry-point\.js/);
			lines[1].should.match(/a dependency to an entry point is not allowed/);
			lines = errors[1].split("\n");
			lines[0].should.match(/require-entry-point\.js/);
			lines[1].should.match(/a dependency to an entry point is not allowed/);
			done();
		});
	});
	it("should warn about case-sensitive module names", function(done) {
		getErrors({
			entry: "./case-sensitive"
		}, function(errors, warnings) {
			if(errors.length === 0) {
				warnings.length.should.be.eql(2);
				var lines = warnings[0].split("\n");
				lines[0].should.match(/file\.js/);
				lines = warnings[1].split("\n");
				lines[0].should.match(/FILE\.js/);
			} else {
				errors.length.should.be.eql(1);
				warnings.length.should.be.eql(0);
			}
			done();
		});
	});
});