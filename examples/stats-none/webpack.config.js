"use strict";

const path = require("path");

/** @type {import("webpack").Configuration} */
const config = {
	output: {
		path: path.join(__dirname, "dist"),
		filename: "output.js"
	},
	stats: "none"
};

module.exports = config;
