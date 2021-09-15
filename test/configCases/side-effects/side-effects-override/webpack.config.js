const path = require("path");
/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	module: {
		rules: [
			{
				test: path.resolve(__dirname, "node_modules/pmodule"),
				sideEffects: true
			},
			{
				test: path.resolve(__dirname, "node_modules/nmodule"),
				sideEffects: false
			}
		]
	}
};
