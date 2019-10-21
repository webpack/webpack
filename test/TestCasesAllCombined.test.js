const { describeCases } = require("./TestCases.template");
const webpack = require("..");

describe("TestCases", () => {
	describeCases({
		name: "all-combined",
		mode: "production",
		devtool: "source-map",
		minimize: true,
		optimization: {
			moduleIds: "named",
			chunkIds: "named"
		},
		plugins: [new webpack.HotModuleReplacementPlugin()]
	});
});
