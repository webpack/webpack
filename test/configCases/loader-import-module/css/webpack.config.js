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
				oneOf: [
					{
						test: /other-stylesheet\.js$/,
						loader: "./loader",
						options: {
							publicPath: "/other/"
						},
						type: "asset/source"
					},
					{
						test: /stylesheet\.js$/,
						use: "./loader",
						type: "asset/source"
					}
				]
			},
			{
				test: /\.jpg$/,
				loader: "file-loader",
				options: {
					name: "assets/[name].[ext]"
				}
			}
		]
	},
	experiments: {
		executeModule: true
	},
	plugins: [
		compiler =>
			compiler.hooks.done.tap("test case", stats => {
				expect(stats.compilation.getAsset("assets/file.png")).toHaveProperty(
					"info",
					expect.objectContaining({ sourceFilename: "file.png" })
				);
				expect(stats.compilation.getAsset("assets/file.jpg")).toHaveProperty(
					"info",
					expect.objectContaining({ sourceFilename: "file.jpg" })
				);
				const { auxiliaryFiles } = stats.compilation.namedChunks.get("main");
				expect(auxiliaryFiles).toContain("assets/file.png");
				expect(auxiliaryFiles).toContain("assets/file.png?1");
				expect(auxiliaryFiles).toContain("assets/file.jpg");
			})
	]
};
