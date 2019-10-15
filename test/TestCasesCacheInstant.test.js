const path = require("path");
const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "cache instant",
		cache: {
			type: "filesystem",
			store: "instant",
			managedPaths: [path.resolve(__dirname, "../node_modules")]
		}
	});
});
