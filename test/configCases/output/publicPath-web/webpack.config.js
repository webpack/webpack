/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "none",
	target: "web",
	entry() {
		return {
			a: "./a",
			b: "./b",
			c: {
				import: "./c",
				publicPath: "/other/"
			},
			d: {
				import: "./d",
				publicPath: "/other/"
			}
		};
	},
	output: {
		filename: data => {
			return /^[ac]$/.test(data.chunk.name)
				? `inner1/inner2/[name].js`
				: "[name].js";
		},
		assetModuleFilename: "[name][ext]"
	},
	module: {
		rules: [
			{
				test: /\.jpg$/,
				type: "asset/resource"
			}
		]
	}
};
