"use strict";

const path = require("path");

/** @type {import("webpack").Configuration} */
const config = {
	// mode: "development" || "production",
	mode: "production",
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "output.js"
	},
	// Enable dotenv plugin with default settings
	// Loads .env file and exposes WEBPACK_* prefixed variables
	dotenv: true
	// Advanced usage:
	// dotenv: {
	//   dir: path.resolve(__dirname, "./custom-env-dir"),
	//   prefix: ["WEBPACK_", "APP_"],
	//   template: [".env", ".env.local", ".env.[mode]"]
	// }
};

module.exports = config;
