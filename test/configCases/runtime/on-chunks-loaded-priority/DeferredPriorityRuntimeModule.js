"use strict";

const RuntimeGlobals = require("../../../../lib/RuntimeGlobals");
const RuntimeModule = require("../../../../lib/RuntimeModule");

// Only an odd priority waits for lower ones, so the even handler must run while
// the blocked priority-0 one stays deferred.
class DeferredPriorityRuntimeModule extends RuntimeModule {
	constructor() {
		super("deferred priority probe", RuntimeModule.STAGE_TRIGGER);
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const chunk = /** @type {import("../../../../lib/Chunk")} */ (this.chunk);
		const order = `${RuntimeGlobals.global}.__onChunksLoadedOrder`;
		return [
			`${order} = [];`,
			`${RuntimeGlobals.onChunksLoaded}(0, ["__never_loaded__"], function() { ${order}.push("blocked"); }, 0);`,
			`${RuntimeGlobals.onChunksLoaded}(0, [${JSON.stringify(
				chunk.id
			)}], function() { ${order}.push("even"); }, 2);`
		].join("\n");
	}
}

module.exports = DeferredPriorityRuntimeModule;
