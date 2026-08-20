/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const SLASH_CHAR_CODE = 47;

/**
 * Whether a `resolve.alias` name applies to a request. Mirrors `AliasPlugin`:
 * a name matches the whole request or a leading segment of it, and
 * `onlyModule` restricts it to the former.
 * @param {string} request the request as written
 * @param {string} name the alias name, already normalized by enhanced-resolve
 * @param {boolean=} onlyModule whether the alias only matches the whole request
 * @returns {boolean} true when the alias applies to the request
 */
const matchAlias = (request, name, onlyModule) => {
	if (!request.startsWith(name)) return false;
	if (request.length === name.length) return true;
	return !onlyModule && request.charCodeAt(name.length) === SLASH_CHAR_CODE;
};

module.exports = matchAlias;
