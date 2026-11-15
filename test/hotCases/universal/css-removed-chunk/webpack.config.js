"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: { main: "./index.js", other: "./other.js" },
	context: path.resolve(__dirname, "../../css/removed-chunk"),
	experiments: { css: true },
	output: { publicPath: "auto", filename: "[name].mjs" }
};
