const { describeCases } = require("./TestCases.template");
const webpack = require("../lib/webpack");

describe("TestCases", () => {
	describeCases({
		name: "all-combined",
		mode: "production",
		devtool: "#@source-map",
		minimize: true,
		plugins: [
			new webpack.HotModuleReplacementPlugin(),
			new webpack.NamedModulesPlugin(),
			new webpack.NamedChunksPlugin()
		]
	});
});
