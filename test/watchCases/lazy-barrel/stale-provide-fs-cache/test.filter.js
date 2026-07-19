"use strict";

// TODO experiments.incremental: not yet supported; un-filter in the stack PR
// that adds the corresponding fix.
module.exports = (config) =>
	!(config.experiments && config.experiments.incremental);
