it("should contain no comments in out chunk", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8");
	source.should.not.match(/[^\"]comment should be stripped test\.1[^\"]/);
	source.should.not.match(/[^\"]comment should be stripped test\.2[^\"]/);
	source.should.not.match(/[^\"]comment should be stripped test\.3[^\"]/);
});

it("should contain comments in vendors chunk", function() {
	var fs = require("fs"),
		path = require("path");
	var source = fs.readFileSync(path.join(__dirname, "vendors.js"), "utf-8");
	source.should.containEql("comment should not be stripped vendors.1");
	source.should.containEql("// comment should not be stripped vendors.2");
	source.should.containEql(" * comment should not be stripped vendors.3");
});

// this test is based off https://github.com/mishoo/UglifyJS2/blob/master/test/compress/screw-ie8.js
it("should pass mangle options", function() {
	var fs = require("fs"),
		path = require("path");
	var source = fs.readFileSync(path.join(__dirname, "ie8.js"), "utf-8");
	source.should.containEql("function r(t){return function(n){try{t()}catch(t){n(t)}}}");
});

it("should extract comments to separate file", function() {
	var fs = require("fs"),
		path = require("path");
	var source = fs.readFileSync(path.join(__dirname, "extract.js.LICENSE"), "utf-8");
	source.should.containEql("comment should be extracted extract-test.1");
	source.should.not.containEql("comment should be stripped extract-test.2");
	source.should.containEql("comment should be extracted extract-test.3");
	source.should.not.containEql("comment should be stripped extract-test.4");
});

it("should remove extracted comments and insert a banner", function() {
	var fs = require("fs"),
		path = require("path");
	var source = fs.readFileSync(path.join(__dirname, "extract.js"), "utf-8");
	source.should.not.containEql("comment should be extracted extract-test.1");
	source.should.not.containEql("comment should be stripped extract-test.2");
	source.should.not.containEql("comment should be extracted extract-test.3");
	source.should.not.containEql("comment should be stripped extract-test.4");
	source.should.containEql("/*! For license information please see extract.js.LICENSE */");
});

it("should pass compress options", function() {
	var fs = require("fs"),
		path = require("path");
	var source = fs.readFileSync(path.join(__dirname, "compress.js"), "utf-8");
	source.should.containEql("function e(){var o=2;o=3,console.log(1+o),console.log(o+3),console.log(4),console.log(1+o+3)}");
});

require.include("./test.js");
