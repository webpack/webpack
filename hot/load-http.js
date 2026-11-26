/** @import http from "http" */
/** @import https from "https" */

/**
 * @param {boolean} isHTTPS true when need https module, otherwise false
 * @returns {Promise<http | https>}
 */
module.exports = function (isHTTPS) {
	return isHTTPS ? import("https") : import("http");
};
