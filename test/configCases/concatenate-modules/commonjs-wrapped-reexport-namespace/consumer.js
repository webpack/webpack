"use strict";

// this require() wraps "barrel", so its re-export fragments render at runtime
// instead of resolving to hoisted bindings
const barrel = require("./barrel");

exports.namedA = barrel.named.a;
exports.wholeDefault = barrel.whole.default.value;
exports.textDefault = barrel.text.default;
exports.sameNamespace = barrel.named === require("./barrel").named;
