/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		publicPath: "/public/"
	},
	module: {
		parser: {
			javascript: {
				url: "relative"
			}
		},
		generator: {
			asset: {
				filename: "assets/[name][ext][query]"
			}
		},
		rules: [
			{
				test: /stylesheet\.js$/,
				use: "./loader",
				type: "asset/source"
			}
		]
	},
	experiments: {
		executeModule: true
	},
	plugins: [
		compiler =>
			compiler.hooks.done.tap("test case", stats =>
				expect(stats.compilation.getAsset("assets/file.png")).toHaveProperty(
					"info",
					expect.objectContaining({ sourceFilename: "file.png" })
				)
			)
	]
};
