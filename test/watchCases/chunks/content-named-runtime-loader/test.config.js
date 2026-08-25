"use strict";

const fs = require("fs");

module.exports = {
	findBundle(_index, options) {
		return fs
			.readdirSync(/** @type {string} */ (options.output.path))
			.filter((name) => /^main\./.test(name))
			.map((name) => `./${name}`);
	}
};
