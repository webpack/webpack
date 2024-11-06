/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: {
		light: { import: "./light.js", layer: "light" },
		dark: { import: "./dark.js", layer: "dark" }
	},
	experiments: {
		layers: true,
		css: true
	},
	optimization: {
		runtimeChunk: "single"
	},
	output: {
		filename: "[name].js"
	},
	module: {
		rules: [
			{
				test: /\.less$/i,
				type: "css/auto",
				oneOf: [
					{
						issuerLayer: "light",
						use: [
							{
								loader: "less-loader",
								options: {
									additionalData:
										"@color: white; @property-color: color-light; @property-background: background-light;"
								}
							}
						]
					},
					{
						issuerLayer: "dark",
						use: [
							{
								loader: "less-loader",
								options: {
									additionalData:
										"@color: black; @property-color: color-dark; @property-background: background-dark;"
								}
							}
						]
					}
				]
			}
		]
	}
};
