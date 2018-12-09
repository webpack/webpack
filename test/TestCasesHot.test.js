const { describeCases } = require("./TestCases.template");
const webpack = require("..");

describe("TestCases", () => {
	describeCases({
		name: "hot",
		plugins: [new webpack.HotModuleReplacementPlugin()]
	});
});
