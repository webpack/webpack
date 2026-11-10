"use strict";

const fs = require("fs");

module.exports = {
	findBundle(_i, options) {
		return fs
			.readdirSync(options.output.path)
			.filter((file) => /^main\.[a-f0-9]+\.js$/.test(file))
			.map((file) => `./${file}`);
	}
};
