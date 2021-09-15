it("should have named modules ids", function() {
	for (var i = 1; i <= 5; i++) {
		var moduleId = require("./files/file" + i + ".js");

		expect(moduleId).toMatch(/^[/=a-zA-Z0-9]{4,5}$/);
	}
});
