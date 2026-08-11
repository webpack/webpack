"use strict";

// counts how often the importer is re-run across watch steps
let runs = 0;

/**
 * @param {string} source source
 * @returns {string} source
 */
module.exports = function loader(source) {
	runs++;
	return `var LOADER_RUNS = ${runs};\n${source}`;
};
