const mkdirp = require("mkdirp");
const fs = require("fs");
const path = require("path");

module.exports = {
	beforeExecute(options) {
		const outputPath = options.output.path;

		mkdirp.sync(outputPath);
		fs.writeFileSync(path.join(outputPath, "file.js"), "module.exports = 1;");
	}
};
