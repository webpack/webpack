"use strict";

/** @type {import("../../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	output: { filename: "[name].js", pathinfo: false },
	module: { generator: { html: { extract: true } } },
	experiments: { html: true }
};
