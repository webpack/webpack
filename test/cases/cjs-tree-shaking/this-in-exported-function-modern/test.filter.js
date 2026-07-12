"use strict";

// usedExports analysis only runs outside development mode
module.exports = (config) => config.mode !== "development";
