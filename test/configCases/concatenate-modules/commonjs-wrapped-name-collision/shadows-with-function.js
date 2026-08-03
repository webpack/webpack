"use strict";

// a hoisted declaration shadows the accessor even above its own require()
function dep_namespaceFn() {
	return "local function";
}

const dep = require("./dep.js");

module.exports = { value: dep.value, local: dep_namespaceFn() };
