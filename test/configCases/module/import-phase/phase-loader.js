"use strict";

module.exports = function (source) {
	const options = this.getOptions();
	return `${source}\nexport default ${JSON.stringify(
		options.phase
	)};\n`;
};

