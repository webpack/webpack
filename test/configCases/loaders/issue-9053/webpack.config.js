/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /c\.js$/,
				use: ["loader2"]
			},
			{
				test: /d\.js$/,
				use: ["loader3"]
			}
		]
	}
};
