/** @type {import("../../../").Configuration} */
const base = {
	mode: "production",
	entry: "./index.js",
	module: {
		rules: [
			{
				test: /\.(png|jpg|svg)$/,
				type: "asset"
			},
			{
				test: /\.html$/,
				type: "asset/resource",
				generator: {
					filename: "static/[name][ext]"
				}
			},
			{
				test: /\.css$/,
				type: "asset/source"
			},
			{
				test: /\.source\.js$/,
				type: "asset/inline"
			},
			{
				mimetype: "text/plain",
				type: "asset"
			}
		]
	},
	output: {
		filename: "bundle.js"
	}
};

module.exports = [
	{
		...base,
		optimization: {
			concatenateModules: false
		}
	},
	base
];
