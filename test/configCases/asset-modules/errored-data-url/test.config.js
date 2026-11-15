"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const pages = fs
			.readdirSync(options.output.path)
			.filter((file) => file.endsWith(".html"));
		if (pages.length !== 1) {
			throw new Error(`Expected one file for the asset, got ${pages}.`);
		}
		// The asset failed to build, so its file holds nothing of the error.
		const content = fs.readFileSync(
			path.resolve(options.output.path, pages[0]),
			"utf8"
		);
		if (content !== "") {
			throw new Error(`Expected an empty file, got ${content}.`);
		}
	}
};
