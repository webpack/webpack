"use strict";

const fs = require("node:fs");

module.exports = {
	findBundle(_i, options) {
		return fs
			.readdirSync(options.output.path)
			.filter((f) => /^bundle\./.test(f))
			.map((f) => `./${f}`);
	}
};
