"use strict";

const fs = require("fs");

// `output.filename` is `[name].js` so the test entry bundle lives at
// `main.js`, not `bundle0.js`. Tell the harness where to find it; we also
// load the vendor chunk first so its module factories are registered before
// `main.js` requires them at runtime.
module.exports = {
	findBundle(_i, options) {
		const files = fs.readdirSync(options.output.path);
		if (!files.includes("main.js")) return undefined;
		const vendor = files.find((f) => f === "vendor.js");
		return vendor ? [`./${vendor}`, "./main.js"] : ["./main.js"];
	}
};
