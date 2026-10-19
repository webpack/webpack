"use strict";

const fs = require("fs");

module.exports = {
	findBundle(_i, options) {
		return fs
			.readdirSync(options.output.path)
			.filter((f) => /^(main|other)\./.test(f))
			.map((f) => `./${f}`);
	}
};
