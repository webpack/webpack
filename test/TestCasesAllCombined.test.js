const { describeCases } = require("./TestCases.template");

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
		plugins: [
			c => {
				const webpack = require("..");
				new webpack.HotModuleReplacementPlugin().apply(c);
			}
		]
	});
});
