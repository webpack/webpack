/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "none",
	module: {
		rules: [
			{
				test: /a\.js$/,
				use: "./loader"
			}
		]
	}
};
