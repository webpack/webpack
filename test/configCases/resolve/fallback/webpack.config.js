const path = require("path");
/** @type {import("../../../../").Configuration} */
module.exports = {
	resolve: {
		fallback: {
			"./b": path.resolve(__dirname, "a")
		}
	}
};
