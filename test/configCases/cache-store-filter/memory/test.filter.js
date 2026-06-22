"use strict";

// The case configures its own `cache.storeFilter`; skip the filesystem-cache
// runner, which replaces `options.cache` and drops the filter.
module.exports = (options) =>
	!(options.cache && options.cache.type === "filesystem");
