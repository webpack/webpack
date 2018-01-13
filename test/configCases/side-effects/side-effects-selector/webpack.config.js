const path = require("path");
module.exports = {
	mode: "production",
	module: {
		rules: [
			{
				test: path.resolve(__dirname, "node_modules/pmodule")
			},
			{
				test: path.resolve(__dirname, "node_modules/pmodule2")
			}
		]
	}
};
