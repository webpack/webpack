const path = require("path");
module.exports = {
	resolve: {
		alias: {
			_: [path.resolve(__dirname, "a"), path.resolve(__dirname, "b")]
		}
	}
};
