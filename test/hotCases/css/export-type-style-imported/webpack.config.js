"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	module: {
		rules: [
			{
				test: /.css$/,
				type: "css/module",
				parser: {
					exportType: "style"
				}
			}
		]
	},
	experiments: {
		css: true
	}
};
