const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	resolve: {
		modules: ["node_modules", path.resolve(__dirname, "./node_modules")]
	}
};
