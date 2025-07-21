"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: [`async-node${process.versions.node.split(".").map(Number)[0]}`],
	entry: ["../defer-runtime/all.js"],
	optimization: {
		concatenateModules: false
	},
	module: {
		rules: [
			{
				test: /index\.js/,
				type: "javascript/esm"
			}
		]
	},
	experiments: {
		deferImport: true
	}
};
