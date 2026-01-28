"use strict";

const path = require("path");

/** @type {import("webpack").Configuration} */
const config = {
	output: {
		path: path.join(__dirname, "dist"),
		filename: "output.js"
	},
	stats: "normal"
};

module.exports = config;
