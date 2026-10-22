"use strict";

const fs = require("fs");

module.exports = {
	findBundle(index, options) {
		const entry = `a-${index}.js`;
		const split = fs
			.readdirSync(/** @type {string} */ (options.output.path))
			.filter((file) => file.endsWith(`-${index}.js`) && !/^[a-e]-/.test(file))
			.sort();
		return [...split.map((file) => `./${file}`), `./${entry}`];
	}
};
