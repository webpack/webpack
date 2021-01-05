expect.extend({
	toBeValidModuleId(received, moduleIdString) {
		const pass = typeof received === "number" || received === moduleIdString;
		if (pass) {
			return {
				message: () => `expected ${received} not to be a valid module id`,
				pass: true
			};
		} else {
			return {
				message: () => `expected ${received} to be a valid module id`,
				pass: false
			};
		}
	}
});

it("should replace ! with %21 in the module id string of the context module", function () {
	const moduleId = require.context("./folder", true, /^(?!file1\.js$).*$/i, "lazy").id;
	expect(moduleId).toBeValidModuleId("./context/issue-10969/folder lazy recursive ^(?%21file1\\.js$).*$/");
});
