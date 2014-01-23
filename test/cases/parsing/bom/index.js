it("should load a utf-8 file with BOM", function() {
	var result = require("./bomfile");
	result.should.be.eql("ok");
});

it("should load a css file with BOM", function() {
	var css = require("!css-loader!./bomfile.css");
	css.should.be.eql("body{color:#abc}");
});
