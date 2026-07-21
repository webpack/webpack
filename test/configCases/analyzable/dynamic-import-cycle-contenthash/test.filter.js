"use strict";

// realContentHash + ESM output re-writes the RealContentHashPlugin analyse cache
// item on every build ("Pack got invalid") independent of this feature — skip
// only the filesystem-cache variant.
module.exports = (config) => !config.cache;
