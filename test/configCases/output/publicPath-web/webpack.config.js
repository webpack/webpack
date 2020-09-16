/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "none",
	target: "web",
	entry() {
		return {
			a: "./a",
			b: "./b"
		};
	},
	output: {
		filename: data => {
			return data.chunk.name === "a" ? `inner1/inner2/[name].js` : "[name].js";
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
