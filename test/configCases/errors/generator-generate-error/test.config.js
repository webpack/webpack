const findOutputFiles = require("../../../helpers/findOutputFiles");

module.exports = {
	findBundle(i, options) {
		const files = findOutputFiles(options, new RegExp(/\.js$/));

		return files.sort((a, b) => (a.startsWith("main") ? 1 : 0));
	}
};
