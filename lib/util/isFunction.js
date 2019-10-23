/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Frank Qiu
*/

"use strict";

/**
 * Determine if a value is a Function
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
module.exports = function isFunction(val) {
	return Object.prototype.toString.call(val) === "[object Function]";
};
