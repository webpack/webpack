it("should have module ids defined in sorted order", function() {
	for (var i = 1; i <= 5; i++) {
		var unusedModuleId = require("./files/file" + i + ".js");
	}

	const moduleIds = Object.keys(__webpack_modules__);

	const sortedIds = moduleIds.slice().sort();
	expect(moduleIds).toEqual(sortedIds);
});
