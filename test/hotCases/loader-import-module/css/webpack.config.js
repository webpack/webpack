/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		generator: {
			asset: {
				filename: "assets/[name][ext]"
			}
		},
		rules: [
			{
				test: /\.css\.js$/,
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
			compiler.hooks.done.tap("test case", stats => {
				const png = stats.compilation.getAsset("assets/file.png");
				const jpg = stats.compilation.getAsset("assets/file.jpg");
				if (png) {
					expect(jpg).toBe(undefined);
					expect(png).toHaveProperty(
						"info",
						expect.objectContaining({ sourceFilename: "file.png" })
					);
				} else {
					expect(jpg).toHaveProperty(
						"info",
						expect.objectContaining({ sourceFilename: "file.jpg" })
					);
				}
			})
	]
};
