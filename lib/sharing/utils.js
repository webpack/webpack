/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/**
 * @param {string} version version as string
 * @returns {(number|string)[]} version as array
 */
exports.parseRequiredVersion = version => {
	let fuzzyStart = Infinity;
	if (version.startsWith(">=")) {
		fuzzyStart = 0;
		version = version.slice(2);
	} else if (version.startsWith("^")) {
		fuzzyStart = 1;
		version = version.slice(1);
	} else if (version.startsWith("~")) {
		fuzzyStart = 2;
		version = version.slice(1);
	}
	return version
		.split(".")
		.map((x, i) => (i >= fuzzyStart && `${+x}` === x ? +x : x));
};

/**
 * @param {string} version version as string
 * @returns {(number|string)[]} version as array
 */
exports.parseVersion = version => {
	return version.split(".").map(x => (`${+x}` === x ? +x : x));
};

/**
 * @param {(number|string)[]} version version
 * @returns {string} version as string
 */
exports.versionToString = version => {
	if (!version) return "(unknown)";
	const info = version.map(value =>
		typeof value !== "string"
			? {
					type: "min",
					value: `${value}`
			  }
			: `${+value}` === value
			? {
					type: "exact",
					value
			  }
			: {
					type: "tag",
					value
			  }
	);
	switch (`${info[0].type}.${info.length > 1 ? info[1].type : "undefined"}`) {
		case "exact.min":
		case "tag.min":
			if (!info.slice(2).some(i => i.type === "exact"))
				return `^${version.join(".")}`;
			break;

		case "exact.exact":
		case "exact.tag":
		case "tag.exact":
		case "tag.tag":
			if (!info.slice(2).some(i => i.type === "exact"))
				return `~${version.join(".")}`;
			else if (!info.slice(2).some(i => i.type === "min"))
				return version.join(".");
			break;

		case "min.min":
		case "min.tag":
			if (!info.slice(2).some(i => i.type === "exact"))
				return `>=${version.join(".")}`;
			break;

		case "min.undefined":
			return `>=${version.join(".")}`;

		case "exact.undefined":
		case "tag.undefined":
			return version.join(".");
	}
	return info
		.map(i => (i.type === "exact" ? i.value : `[>=${i.value}]`))
		.join(".");
};

/**
 * @param {string} str maybe required version
 * @returns {boolean} true, if it looks like a version
 */
exports.isRequiredVersion = str => {
	if (str.startsWith("^")) return true;
	if (str.startsWith("~")) return true;
	if (str.startsWith(">=")) return true;
	return /^\d/.test(str);
};
