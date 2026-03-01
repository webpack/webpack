it("should throw helpful error when module is not found at runtime", function () {
	const helper = require("./helper");
	expect(helper).toBe("helper");

	const moduleId = Object.keys(__webpack_modules__).find((id) =>
		id.includes("helper")
	);
	expect(moduleId).toBeDefined();
	delete __webpack_module_cache__[moduleId];
	delete __webpack_modules__[moduleId];

	let thrownError;
	try {
		require("./helper");
	} catch (e) {
		thrownError = e;
	}

	expect(thrownError).toBeDefined();
	expect(thrownError.message).toMatch(/Cannot find module/);
	expect(thrownError.code).toBe("TEST");
});
