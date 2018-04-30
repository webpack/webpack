require("should");
it("should be able to use global in a harmony module", function() {
	var x = require("./module1");
	(x.default === global).should.be.ok();
});
