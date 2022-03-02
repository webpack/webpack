const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.jpe?g$/,
				type: "asset/resource",
				loader: path.resolve(__dirname, "loader")
			}
		]
	}
};
