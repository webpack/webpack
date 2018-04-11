const { describeCases } = require("./TestCases.template");
const webpack = require("../lib/webpack");

describe("TestCases", () => {
	describeCases({
		name: "devtool-eval-named-modules",
		devtool: "eval",
		plugins: [new webpack.NamedModulesPlugin()]
	});
});
