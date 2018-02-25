const { describeCases } = require("./TestCases.template");
const Stats = require("../lib/Stats");
const webpack = require("../lib/webpack");

describe("TestCases", () => {
	describeCases({
		name: "devtool-eval-named-modules",
		devtool: "eval",
		plugins: [
			new webpack.NamedModulesPlugin()
		]
	});
});
