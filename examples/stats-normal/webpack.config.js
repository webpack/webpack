"use strict";

const path = require("path");

/** @import { Configuration } from "webpack" */

/** @type {Configuration} */
const config = {
	output: {
		path: path.join(__dirname, "dist"),
		filename: "output.js"
	},
	stats: "normal"
};

module.exports = config;
