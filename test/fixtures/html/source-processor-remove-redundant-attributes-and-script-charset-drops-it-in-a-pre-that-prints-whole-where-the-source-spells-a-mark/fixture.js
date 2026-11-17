"use strict";

/**
 * @returns {string} a `<pre>` holding a `<script charset>` beside NULs spelling the mark that holds it back, then a comment that keeps a `<meta charset>` out of reach until it is dropped
 */
const source = () => {
	const nul = String.fromCharCode(0);
	return `<!doctype html><title>t</title><pre>${nul}charset0${nul}<script charset="utf-8" src="a.js" title="${nul}charset0${nul}"></script>${nul}charset${nul}</pre><!--${"x".repeat(1100)}--><meta charset="utf-8">\n`;
};

module.exports = { source };
