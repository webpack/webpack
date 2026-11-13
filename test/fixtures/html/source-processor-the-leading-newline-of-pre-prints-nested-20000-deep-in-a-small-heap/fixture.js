"use strict";

/**
 * @returns {string} `<pre>` nested 20000 deep around one character
 */
const source = () =>
	`${"<pre>".repeat(20000)}x${"</pre>".repeat(20000)}`;

module.exports = { source };
