"use strict";

const { EnvironmentPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	mode: "development",
	plugins: [
		new EnvironmentPlugin({
			MY_NODE_ENV: "test",
			API_URL: "https://api.example.com",
			API_KEY: "secret123",
			DEBUG: "true",
			MAX_RETRIES: "3",
			EMPTY_VAR: "",
			FEATURE_FLAG: "false"
		})
	],
	optimization: {
		minimize: false
	}
};
