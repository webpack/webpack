"use strict";

const fs = require("node:fs");

// `output.filename` is `[name].js` so the test entry bundle lives at
// `main.js`, not `bundle0.js`. Tell the harness where to find it.
module.exports = {
	findBundle(_i, options) {
		const files = fs.readdirSync(options.output.path);
		return files.includes("main.js") ? ["./main.js"] : undefined;
	}
};
