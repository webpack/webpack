const { describeCases } = require("./TestCases.template");
const webpack = require("..");

describe("TestCases", () => {
	describeCases({
		name: "hot-multi-step",
		plugins: [
			new webpack.HotModuleReplacementPlugin({
				multiStep: true
			})
		]
	});
});
