"use strict";

const fs = require("fs");

module.exports = {
	findBundle(index, options) {
		return fs
			.readdirSync(options.output.path)
			.filter((name) => /^bundle0\.mjs$/.test(name));
	}
};
