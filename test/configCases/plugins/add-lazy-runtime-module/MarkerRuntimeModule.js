"use strict";

const RuntimeModule = require("../../../../lib/RuntimeModule");

// Loaded through `addLazyRuntimeModule`, so it must reach the chunk's runtime.
class MarkerRuntimeModule extends RuntimeModule {
	constructor() {
		super("lazy marker");
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		return 'globalThis.__lazyRuntimeMarker = "attached";';
	}
}

module.exports = MarkerRuntimeModule;
