/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const parseOptions = (prefix, options, result) => {
	if (Array.isArray(options)) {
		for (const item of options) {
			parseOptions(prefix, item, result);
		}
	} else if (typeof options === "string") {
		result.push([prefix + options.replace(/^([^\w]+\/)+/, ""), options]);
	} else if (options && typeof options === "object") {
		for (const key of Object.keys(options)) {
			const value = options[key];
			if (typeof value === "string") {
				result.push([prefix + key, value]);
			} else {
				parseOptions(prefix + key + "/", value, result);
			}
		}
	}
};

module.exports = options => {
	const result = [];
	parseOptions("", options, result);
	return result;
};
