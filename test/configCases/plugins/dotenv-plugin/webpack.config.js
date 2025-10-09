"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// Test 1: Basic - default behavior with WEBPACK_ prefix
	{
		name: "basic",
		mode: "development",
		entry: "./basic.js",
		dotenv: true
	},
	// Test 2: Expand - variables are always expanded
	{
		name: "expand",
		mode: "development",
		entry: "./expand.js",
		dotenv: true
	},
	// Test 3: Custom dir - load from different directory
	{
		name: "custom-dir",
		mode: "development",
		entry: "./custom-envdir.js",
		dotenv: {
			dir: path.resolve(__dirname, "./envs")
		}
	},
	// Test 4: Custom prefixes - multiple prefixes
	{
		name: "custom-prefixes",
		mode: "development",
		entry: "./custom-prefixes.js",
		dotenv: {
			dir: path.resolve(__dirname, "./prefixes-env"),
			prefix: ["APP_", "CONFIG_"]
		}
	},
	// Test 5: Mode-specific - .env.[mode] overrides
	{
		name: "mode-specific",
		mode: "production",
		entry: "./mode-specific.js",
		dotenv: true
	},
	// Test 6: Disabled dir - dir: false disables .env file loading
	{
		name: "disabled-dir",
		mode: "development",
		entry: "./disabled-dir.js",
		dotenv: false
	},
	// Test 7: Custom template - load files based on custom template patterns
	{
		name: "custom-template",
		mode: "production",
		entry: "./custom-template.js",
		dotenv: {
			template: [".env", ".env.myLocal", ".env.[mode]", ".env.[mode].myLocal"]
		}
	}
];
