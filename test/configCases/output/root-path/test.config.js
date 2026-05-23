const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle(testDirectory, outputDirectory) {
		// The bundle should be at /bundle.js
		// Since webpack writes to / (root), we need to check the output directory
		// which is set up by the test infrastructure
		return fs.readdirSync(outputDirectory).map(file => {
			return path.join(outputDirectory, file);
		});
	}
};
