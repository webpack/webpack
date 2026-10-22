"use strict";

const findOutputFiles = require("../../../helpers/findOutputFiles");

module.exports = {
	findBundle(i, options) {
		return `./inner/${findOutputFiles(options, /^main\./, "inner")[0]}`;
	}
};
