"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	externals: {
		"https://example.test/image%20name.png":
			"asset https://example.test/image%20name.png",
		"//example.test/image%20name.png": "asset //example.test/image%20name.png"
	},
	output: {
		publicPath: ""
	},
	module: {
		rules: [{ test: /\.png$/, type: "asset/resource" }]
	},
	experiments: {
		html: true
	}
};
