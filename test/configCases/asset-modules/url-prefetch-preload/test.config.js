"use strict";

module.exports = {
	currentScriptNonce: "csp-nonce-from-script-tag",
	findBundle(i) {
		return i === 0 ? ["main.script.js"] : ["main.module.mjs"];
	}
};
