/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const parseOptionsInternal = (prefix, options, result) => {
	if (Array.isArray(options)) {
		for (const item of options) {
			parseOptionsInternal(prefix, item, result);
		}
	} else if (typeof options === "string") {
		result.push([prefix + options.replace(/^([^\w]+\/)+/, ""), options]);
	} else if (options && typeof options === "object") {
		for (const key of Object.keys(options)) {
			const value = options[key];
			if (typeof value === "string") {
				result.push([prefix + key, value]);
			} else {
				parseOptionsInternal(prefix + key + "/", value, result);
			}
		}
	}
};

/**
 * @param {TODO} options options passed by the user
 * @returns {[string, string][]} parsed options
 */
const parseOptions = options => {
	const result = [];
	parseOptionsInternal("", options, result);
	return result;
};

module.exports = parseOptions;
