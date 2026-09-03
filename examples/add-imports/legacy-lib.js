"use strict"

// A script written for a `<script>` tag: it reads `$` as a global, reaches the
// global through `this`, and expects the polyfill to have run before it.
this.legacyLib = { version: "1.0.0" };

module.exports = {
	render() {
		return `${$(".app")} ${globalThis.legacySupport} v${globalThis.legacyLib.version}`;
	}
};
