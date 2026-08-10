"use strict";

const RuntimeGlobals = require("../../../../lib/RuntimeGlobals");
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
		// the portable global: `globalThis` does not exist on the node baseline
		return `${RuntimeGlobals.global}.__lazyRuntimeMarker = "attached";`;
	}
}

module.exports = MarkerRuntimeModule;
