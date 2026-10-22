"use strict";

const fs = require("fs");

// `output.filename` is `[name].js`, so the entry bundle is `main.js`, not
// `bundle0.js`. The vendor chunk loads first so its module factories are
// registered before `main.js` requires them.
module.exports = {
	findBundle(_i, options) {
		const files = fs.readdirSync(options.output.path);
		if (!files.includes("main.js")) return undefined;
		const vendor = files.find((f) => f === "vendor.js");
		return vendor ? [`./${vendor}`, "./main.js"] : ["./main.js"];
	}
};
