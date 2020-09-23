/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

/** @typedef {import("domhandler").NodeWithChildren} DomNodeWithChildren */

/**
 * @param {DomNodeWithChildren} node node with children
 * @returns {[number, number]|null} range
 * @example
 * for
 * <script> void 0;</script>
 * range of text node " void 0;" will be returned
 */
function childrenRange(node) {
	const firstChild = node.firstChild;
	if (!firstChild) return null;

	return [firstChild.startIndex, node.lastChild.endIndex];
}

exports.childrenRange = childrenRange;
