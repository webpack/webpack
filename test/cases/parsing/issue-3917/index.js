it("should be able to compile a module with UMD", function() {
	var x = require("./module");
	x.default.should.be.equal(global);
});

it("should not find a free exports", function() {
	var x = require("./module2");
	if(typeof exports !== "undefined")
		(x.default).should.be.equal(exports);
	else
		(x.default).should.be.eql(false);
});

export {}
