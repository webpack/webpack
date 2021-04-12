/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /\.generate-json\.js$/,
				use: "./loader",
				type: "json"
			}
		]
	},
	experiments: {
		executeModule: true
	}
};
