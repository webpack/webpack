var path = require("path");
module.exports = {
	resolve: {
		alias: {
			library: path.resolve(__dirname, "../../../js/config/library/2-create-library-with-external/bundle0.js"),
			external: path.resolve(__dirname, "node_modules/external.js")
		}
	}
};
