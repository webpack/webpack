const path = require("path");
/** @type {import("../../../../.").Configuration} */
module.exports = {
	resolve: {
		modules: ["a", path.resolve(__dirname, "a")],
	}
};
