"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	node: { __dirname: false, __filename: false },
	output: { publicPath: "auto" },
	experiments: { css: true }
};
