const findOutputFiles = require("../../../helpers/findOutputFiles");

module.exports = {
	findBundle(_, options) {
		const files = findOutputFiles(options, /^entry/);
		return files;
	}
};
