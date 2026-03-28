"use strict";

const fs = require("fs");

module.exports = {
	findBundle(i, options) {
		const files = fs.readdirSync(options.output.path);
		return files.find((f) => f.startsWith("a.") && f.endsWith(".js"));
	}
};
