const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "production",
		mode: "production",
		deprecations: [
			// TODO update terser-webpack-plugin to use getCache()
			expect.objectContaining({ code: "DEP_WEBPACK_COMPILATION_CACHE" })
		]
	});
});
