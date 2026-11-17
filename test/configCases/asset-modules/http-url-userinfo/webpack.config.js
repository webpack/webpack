"use strict";

const {
	experiments: {
		schemes: { HttpUriPlugin }
	}
} = require("../../../../");
const ServerPlugin = require("../http-url/server");

const serverPlugin = new ServerPlugin(9992);

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "regexp",
		mode: "development",
		plugins: [
			serverPlugin,
			new HttpUriPlugin({
				allowedUris: [/^http:\/\/localhost:9992/],
				upgrade: false,
				frozen: false,
				cacheLocation: false
			})
		]
	},
	{
		name: "function",
		mode: "development",
		plugins: [
			serverPlugin,
			new HttpUriPlugin({
				allowedUris: [(uri) => uri.startsWith("http://localhost:9992")],
				upgrade: false,
				frozen: false,
				cacheLocation: false
			})
		]
	}
];
