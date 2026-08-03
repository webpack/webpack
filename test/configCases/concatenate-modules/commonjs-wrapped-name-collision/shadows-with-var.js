"use strict";

// same name the wrapper accessor for ./dep.js is derived from
var dep_namespaceFn = "local var";

const dep = require("./dep.js");

module.exports = { value: dep.value, local: dep_namespaceFn };
