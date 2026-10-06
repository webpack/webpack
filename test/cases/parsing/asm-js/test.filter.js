"use strict";

// The assertions read the module's source, which a minimizer rewrites
module.exports = (config) => !config.minimize;
