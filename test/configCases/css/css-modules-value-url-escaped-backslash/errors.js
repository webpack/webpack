"use strict";

// The space after `\\` ends the url(), so `./missing\` gets a dependency.
module.exports = [[/Can't resolve '\.\/missing\\'/]];
