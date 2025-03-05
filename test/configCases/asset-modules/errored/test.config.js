const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const files = fs.readdirSync(path.resolve(options.output.path, "./css"));

		if (!/style\.[0-9a-f]{8}\.css/.test(files[0])) {
			throw new Error(`Invalid path for ${files.join(",")} files.`);
		}
	}
};
