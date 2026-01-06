it("should have module ids defined in sorted order", function() {
	const ids = [];
	for (var i = 1; i <= 5; i++) {
		var moduleId = require("./files/file" + i + ".js");
		ids[i-1] = moduleId;
	}

	const expectedIds = new Set(ids);

	const moduleIds = Object.keys(__webpack_modules__).filter(id => expectedIds.has(id));
	expect(moduleIds).toEqual(ids);
});
