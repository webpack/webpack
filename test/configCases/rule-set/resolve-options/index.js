it("should allow to set custom resolving rules", function() {
	var a = require("./a");
	a.should.be.eql("ok");
	var b = require("./b");
	b.should.be.eql("wrong");
});
