"use strict";

const findOutputFiles = require("../../../helpers/findOutputFiles");

module.exports = {
	findBundle(i, options) {
		const bundle = findOutputFiles(options, new RegExp(`^bundle${i}`))[0];
		return `./${bundle}`;
	}
};
