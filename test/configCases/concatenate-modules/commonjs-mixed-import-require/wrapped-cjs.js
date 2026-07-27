"use strict";

global.__mixedOrder = (global.__mixedOrder || []).concat("wrapped-cjs");

// reassigned module.exports -> only concatenable as a wrapped member, so it
// evaluates lazily through its accessor instead of being scope-hoisted
module.exports = {
	tag: "wrapped-cjs"
};
