/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/**
 * test262's strict scenario runs the test source with the directive prepended,
 * so webpack has to parse it strictly rather than only run it strictly.
 * @param {string} source the module source
 * @returns {string} the source parsed under strict mode
 */
module.exports = function prependUseStrict(source) {
	return `"use strict";\n${source}`;
};
