const path = require("path");

/** @type {import("../../../../types").Configuration} */
module.exports = {
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src")
		}
	}
};
