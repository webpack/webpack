/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sam Chen @chenxsan
*/

"use strict";

/**
 * @param {string} urlAndGlobal the script request
 * @returns {string[]} script url and its global variable
 */
module.exports = function extractUrlAndGlobal(urlAndGlobal) {
	const index = urlAndGlobal.indexOf("@");
	return [urlAndGlobal.substring(index + 1), urlAndGlobal.substring(0, index)];
};
