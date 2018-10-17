var path = require("path");

it("should have named modules ids", function() {
	for (var i = 1; i <= 5; i++) {
		var expectedModuleId = "file" + i + ".js";
		var moduleId = require("./files/file" + i + ".js");

		expect(path.basename(moduleId)).toBe(expectedModuleId);
	}
});
