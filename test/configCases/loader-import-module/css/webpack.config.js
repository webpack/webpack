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
		rules: [
			{
				dependency: "url",
				issuer: /stylesheet\.js$/,
				type: "asset/resource",
				generator: {
					filename: "assets/[name][ext][query]"
				}
			},
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
	plugins: [
		compiler =>
			compiler.hooks.done.tap("test case", stats => {
				try {
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
				} catch (err) {
					console.log(stats.toString({ colors: true, orphanModules: true }));
					throw err;
				}
			})
	]
};
