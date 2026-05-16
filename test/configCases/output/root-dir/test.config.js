const path = require("path");
const outputDirectory = __dirname.replace("configCases", "js/config");

module.exports = {
	findBundle: function() {
		return [path.relative(outputDirectory, "/tmp/bundle.js")];
	}
};
