"use strict";

/**
 * @returns {string} 40000 paragraphs, past `_STREAM_MIN_NODES` (49152), where the walk follows the open element stack; then a `<b>` and an `<i>`
 */
const source = () => `${"<p>x</p>".repeat(40000)}<b>y</b><i>z</i>`;

module.exports = {
	source
};
