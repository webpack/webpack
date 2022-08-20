const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	resolve: {
		alias: {
			app: [path.join(__dirname, "src/main"), path.join(__dirname, "src/foo")]
		}
	}
};
