/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	cache: {
		type: "memory"
	},
	module: {
		rules: [
			{
				test: /\.png$/,
				type: "asset/inline"
			},
			{
				test: /\.jpg$/,
				type: "asset/resource"
			},
			{
				test: /\.svg$/,
				type: "asset"
			}
		]
	},
	optimization: {
		concatenateModules: true
	}
};
