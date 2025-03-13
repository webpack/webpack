/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	mode: "development",
	module: {
		rules: [
			{
				test: /\.json$/,
				resourceQuery: /JSONParse=true/,
				type: "json",
				generator: { JSONParse: true }
			}
		],
		generator: { json: { JSONParse: false } }
	}
};
