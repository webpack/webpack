"use strict";

const loader = require("./create-loader")(() => false);

// A stale check rejects options the schema accepts. Not cacheable, so every
// build runs it and reports the stale check, the cached ones included.
/** @type {import("../../../../").LoaderDefinition<{ name: string }>} */
module.exports = function staleLoader(source) {
	this.cacheable(false);
	return /** @type {string} */ (loader.call(this, source));
};
