/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	output: {
		environment: {
			templateLiteral: false
		}
	},
	experiments: {
		css: true
	}
};
