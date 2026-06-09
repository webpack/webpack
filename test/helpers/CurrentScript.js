"use strict";

class CurrentScript {
	constructor(path = "", type = "text/javascript", nonce = undefined) {
		this.src = `https://test.cases/path/${path}index.js`;
		this.type = type;
		this.tagName = "script";
		if (nonce !== undefined) this.nonce = nonce;
	}
}

module.exports = CurrentScript;
