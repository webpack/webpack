"use strict";

const fs = require("fs");

module.exports = {
	findBundle(i, options) {
		return fs
			.readdirSync(options.output.path)
			.find((f) => /^main\..+\.mjs$/.test(f));
	}
};
