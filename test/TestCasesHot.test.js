const { describeCases } = require("./TestCases.template");
const webpack = require("../lib/webpack");

describe("TestCases", () => {
	describeCases({
		name: "hot",
		plugins: [new webpack.HotModuleReplacementPlugin()]
	});
});
