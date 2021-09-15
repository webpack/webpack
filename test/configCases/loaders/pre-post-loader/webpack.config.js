/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /a\.js$/,
				use: "./loader1"
			},
			{
				test: /a\.js$/,
				use: "./loader2",
				enforce: "pre"
			},
			{
				test: /a\.js$/,
				use: "./loader3",
				enforce: "post"
			}
		]
	}
};
