it("should contain the custom progres messages", function() {
	var data = require(__dirname + "/data");
	expect(data).toMatch("optimizing");
	expect(data).toMatch("optimizing|CustomPlugin");
	expect(data).toMatch("optimizing|CustomPlugin|custom category|custom message");
});
