"use strict";

const fs = require("fs");

module.exports = {
	findBundle(i, options) {
		const files = fs.readdirSync(options.output.path);
		return ["runtime.js", files.find((f) => f.startsWith("main"))];
	}
};
