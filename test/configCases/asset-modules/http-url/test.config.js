"use strict";

const fs = require("node:fs");
const path = require("node:path");

module.exports = {
	beforeExecute() {
		try {
			fs.unlinkSync(path.join(__dirname, "dev-defaults.webpack.lock"));
		} catch {
			// Empty
		}
	},
	afterExecute() {
		try {
			fs.unlinkSync(path.join(__dirname, "dev-defaults.webpack.lock"));
		} catch {
			// Empty
		}
	}
};
