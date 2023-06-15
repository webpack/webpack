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
									additionalData: "@color: white;"
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
									additionalData: "@color: black;"
								}
							}
						]
					}
				]
			}
		]
	}
};
