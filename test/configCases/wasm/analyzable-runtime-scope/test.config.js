"use strict";

module.exports = {
	// The overriding runtime is loaded first, so its reassignment has happened by the
	// time the wasm one runs.
	findBundle() {
		return ["./other.mjs", "./main.mjs"];
	}
};
