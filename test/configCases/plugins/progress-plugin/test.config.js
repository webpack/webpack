"use strict";

const path = require("node:path");

module.exports = {
	// sharing global require cache between webpack.config.js and testing file
	modules: {
		[path.resolve(__dirname, "data.js")]: require("./data")
	}
};
