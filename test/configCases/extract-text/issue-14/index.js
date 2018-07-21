var should = require("should");
var path = require("path");
var fs = require("fs");

it("should behave correctly with styles extracted", function(done) {
	var a = require("./styleA.css");
	var bundle = fs.readFileSync(path.join(__dirname, "bundle0.js"), "utf-8");
	var style = fs.readFileSync(path.join(__dirname, "style.css"), "utf-8");
	bundle.should.not.match(/body\{a:1\}/);
	style.should.be.eql("body{base:0}body{" + "a:1}");
	a.should.be.eql({});
	require.ensure([], function(require) {
		var b = require("./styleB.css");
		(b + "").should.be.eql("body{base:0}body{b:2}");
		done();
	});
});