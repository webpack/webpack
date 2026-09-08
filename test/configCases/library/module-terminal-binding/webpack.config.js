"use strict";

module.exports = {
	mode: "production",
	target: "web",
	optimization: {
		minimize: false
	},
	output: {
		library: {
			type: "module"
		},
		module: true
	}
};
