"use strict";

const path = require("path");

/** @type {import("webpack").Configuration} */
const config = {
	// mode: "development" || "production",
	entry: "./example",
	output: {
		path: path.join(__dirname, "dist"),
		filename: "MyLibrary.umd.js",
		library: "MyLibrary",
		libraryTarget: "umd"
	}
};

module.exports = config;
