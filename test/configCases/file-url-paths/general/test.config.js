"use strict";

const fs = require("fs");
const path = require("path");
const { fileURLToPath } = require("url");

module.exports = {
	findBundle(i, options) {
		// output.path stays a "file:" URL on the options; resolve it to a path
		const dir = fileURLToPath(options.output.path);
		const file = `bundle${i}${path.extname(options.output.filename)}`;
		if (fs.existsSync(path.join(dir, file))) {
			return `./${file}`;
		}
	}
};
