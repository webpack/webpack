const webpack = require("..");
const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "hot",
		plugins: [new webpack.HotModuleReplacementPlugin()]
	});
});
