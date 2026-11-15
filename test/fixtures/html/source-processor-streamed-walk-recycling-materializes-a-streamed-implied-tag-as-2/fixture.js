"use strict";

/**
 * @returns {string} an implied `<tbody>` and `<tr>`, then 40000 paragraphs: past the streaming threshold (49152 nodes)
 */
const source = () => `<tr><style>a{color:red}</style>${"<p>x</p>".repeat(40000)}`;

module.exports = {
	source
};
