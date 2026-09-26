/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Raj Aryan @aryanraj45
*/

"use strict";

/* eslint-disable camelcase -- terser's own API, which this speaks */

// terser's own entry point, main.js, as CommonJS: `transform` read for its
// effect, then `minify`. `mozilla-ast` is not read here: `minify` reads it only
// for an ESTree tree in or out, which is all it is for.
require("./transform");

const { minify, minify_sync } = require("./minify");

module.exports = { minify, minify_sync, version: "5.51.2" };
