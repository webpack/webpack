const path = require("path");
/** @type {import("../../../../").Configuration} */
module.exports = {
	resolve: {
		alias: {
			"#": path.resolve(__dirname, "#")
		},
		fallback: {
			"./b": path.resolve(__dirname, "a")
		}
	}
};
