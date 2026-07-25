"use strict";

// the intentionally-erroring modules invalidate the persistent cache
// ("Pack got invalid"), which is noise here — the non-cache run covers it
module.exports = (config) => !config.cache;
