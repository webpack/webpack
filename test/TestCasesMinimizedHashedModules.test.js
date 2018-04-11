const { describeCases } = require("./TestCases.template");
const webpack = require("../lib/webpack");

describe("TestCases", () => {
	describeCases({
		name: "minimized-hashed-modules",
		mode: "production",
		minimize: true,
		plugins: [new webpack.HashedModuleIdsPlugin()]
	});
});
