const path = require("path");
const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "cache pack",
		cache: {
			type: "filesystem"
		},
		snapshot: {
			managedPaths: [path.resolve(__dirname, "../node_modules")]
		},
		optimization: {
			innerGraph: true,
			usedExports: true,
			concatenateModules: true
		}
	});
});
