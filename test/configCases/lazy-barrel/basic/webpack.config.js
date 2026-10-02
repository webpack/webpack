"use strict";

const createLazyBarrelTest = require("../_helpers/createLazyBarrelTest");

module.exports = createLazyBarrelTest([
	"named-barrel/b.js",
	"named-barrel/d.js",
	"mixed-barrel/a.js",
	"mixed-barrel/b.js",
	"star-barrel/c.js",
	"nested-barrel/c.js",
	"ns-barrel/other.js",
	"shared-barrel/d.js"
]);
