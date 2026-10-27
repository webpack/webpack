"use strict";

const fs = require("fs");

const entries = ["e1.js", "e2.js", "e3.js"];

module.exports = {
	findBundle(index, options) {
		const split = fs
			.readdirSync(/** @type {string} */ (options.output.path))
			.filter((file) => file.endsWith(".js") && !entries.includes(file))
			.sort();
		return [...split, ...entries].map((file) => `./${file}`);
	}
};
