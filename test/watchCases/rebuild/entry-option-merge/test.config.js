"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	// the runtime chunk disappears when the merge is skipped — fall back so the
	// assertion in index.js reports it instead of the runner failing on ENOENT
	findBundle: (i, options) =>
		fs.existsSync(path.join(options.output.path, "rt.js"))
			? ["./rt.js", "./main.js"]
			: ["./main.js"]
};
