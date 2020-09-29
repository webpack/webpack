/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.opus$/,
				type: "asset"
			}
		]
	}
};
