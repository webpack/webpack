/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	mode: "development",
	module: {
		rules: [
			{
				test: /\.json$/,
				resourceQuery: /JSONParse=false/,
				type: "json",
				generator: { JSONParse: false }
			}
		],
		generator: { json: { JSONParse: true } }
	}
};
