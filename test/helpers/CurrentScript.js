"use strict";

class CurrentScript {
	/**
	 * @param {string=} path relative path segment appended after `https://test.cases/path/`
	 * @param {string=} type MIME type of the script (e.g. `"text/javascript"`, `"module"`)
	 * @param {string=} nonce CSP nonce reflected on `document.currentScript.nonce`
	 */
	constructor(path, type, nonce) {
		this.src = `https://test.cases/path/${path || ""}index.js`;
		this.type = type || "text/javascript";
		this.tagName = "script";
		if (nonce !== undefined) this.nonce = nonce;
	}
}

module.exports = CurrentScript;
