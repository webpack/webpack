"use strict";

// using `exports` directly bails out of structured exports, so this module
// keeps the "dynamic" exports type that selects `reexport-dynamic-default`
Object.assign(exports, { v: "dynamic" });
