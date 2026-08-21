"use strict";

const RuntimeGlobals = require("../../../../lib/RuntimeGlobals");
const RuntimeModule = require("../../../../lib/RuntimeModule");

// Registers two `__webpack_require__.O` handlers the way a plugin would: one at
// priority 0 waiting on a chunk that never loads, one at an even priority whose
// chunk is already there. Per the documented contract only an odd priority waits
// for lower priorities, so the even one must run while the other stays deferred.
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
