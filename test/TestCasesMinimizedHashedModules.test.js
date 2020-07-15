const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "minimized-hashed-modules",
		mode: "production",
		minimize: true,
		optimization: {
			moduleIds: "hashed"
		},
		deprecations: [
			// TODO update terser-webpack-plugin to use getCache()
			expect.objectContaining({ code: "DEP_WEBPACK_COMPILATION_CACHE" })
		]
	});
});
