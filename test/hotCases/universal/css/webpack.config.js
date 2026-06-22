"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	module: {
		rules: [{ test: /\.css$/, type: "css/module" }]
	},
	experiments: { css: true }
};
