const { describeCases } = require("./TestCases.template");
const Stats = require("../lib/Stats");
const webpack = require("../lib/webpack");

describe("TestCases", () => {
	describeCases({
		name: "hot",
		plugins: [
			new webpack.HotModuleReplacementPlugin()
		]
	});
});
