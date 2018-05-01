it("should be able to use global in a harmony module", function() {
	var x = require("./module1");
	expect(x.default === global).toBeTruthy();
});
