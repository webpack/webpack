"use strict";

const path = require("node:path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	resolve: {
		modules: ["node_modules", path.resolve(__dirname, "./node_modules")]
	}
};
