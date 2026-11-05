"use strict";

const vm = require("vm");

// Before Node 22 a `vm` context reports a property of its global's prototype as
// an own property, so the case can't stage a named element without an own one.
module.exports = () =>
	vm.runInContext(
		'Object.setPrototypeOf(this, { name: 1 }); !Object.prototype.hasOwnProperty.call(this, "name")',
		vm.createContext({})
	);
