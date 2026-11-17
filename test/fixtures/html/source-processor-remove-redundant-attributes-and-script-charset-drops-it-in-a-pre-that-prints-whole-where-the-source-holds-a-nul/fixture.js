"use strict";

/**
 * @returns {string} a `<pre>` holding a `<script charset>` beside a NUL, then a comment that keeps a `<meta charset>` out of reach until it is dropped
 */
const source = () =>
	`<!doctype html><title>t</title><pre><script charset="utf-8" src="a.js" data-x="${String.fromCharCode(
		0
	)}"></script></pre><!--${"x".repeat(1100)}--><meta charset="utf-8">\n`;

module.exports = { source };
