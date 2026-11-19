"use strict";

const values = require("./values.js");

/** @returns {number} twice the current value */
exports.read = function () {
	return Math.max(values.value, values.value) + Math.min(values.value, values.value);
};
