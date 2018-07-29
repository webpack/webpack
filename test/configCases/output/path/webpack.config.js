const path = require("path");

module.exports = {
	output: {
		path: path
			.resolve(__dirname, "../../../js/config/output/path")
			.replace(/\\/g, "/")
	}
};
