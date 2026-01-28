it("should throw helpful error when module is not found at runtime", function () {
	// First, require the helper module to get its id
	const helper = require("./helper");
	expect(helper).toBe("helper");

	// Find the module id for helper.js
	const moduleId = Object.keys(__webpack_modules__).find(
		id => id.includes("helper")
	);
	expect(moduleId).toBeDefined();

	// Delete the module from cache and modules to simulate a corrupted state
	delete __webpack_module_cache__[moduleId];
	delete __webpack_modules__[moduleId];

	// Now trying to require the module should throw a helpful error matching Node.js format
	let thrownError;
	try {
		require("./helper");
	} catch (e) {
		thrownError = e;
	}

	expect(thrownError).toBeDefined();
	expect(thrownError.message).toMatch(/Cannot find module/);
	expect(thrownError.code).toBe("MODULE_NOT_FOUND");
});
