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
	source.should.containEql("function r(n){return function(n){try{t()}catch(t){n(t)}}}");
});


require.include("./test.js");
