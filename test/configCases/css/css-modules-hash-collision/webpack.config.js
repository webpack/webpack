"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	experiments: {
		css: true
	},
	module: {
		rules: [
			{
				test: /\.module\.css$/i,
				type: "css/module"
			}
		]
	}
};
