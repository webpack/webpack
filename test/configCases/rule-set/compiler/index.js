it("should match rule with compiler name", function() {
	var a = require("./a");
	a.should.be.eql("loader matched");
	var b = require("./b");
	b.should.be.eql("loader not matched");
});
