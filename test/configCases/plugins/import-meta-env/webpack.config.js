"use strict";

const { DefinePlugin, EnvironmentPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	// Test 1: NODE_ENV from mode (WebpackOptionsApply)
	mode: "production",
	// Test 3: DotenvPlugin from .env.test file
	dotenv: {
		template: [".env.test"]
	},
	plugins: [
		// Test 2: EnvironmentPlugin
		new EnvironmentPlugin({
			ENV_VAR_FROM_ENV: "from_environment_plugin"
		}),
		// Test 4: DefinePlugin
		new DefinePlugin({
			"import.meta.env.CUSTOM_VAR": JSON.stringify("custom_value")
		})
	]
};
