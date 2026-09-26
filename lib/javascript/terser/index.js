/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Raj Aryan @aryanraj45
*/

"use strict";

/* eslint-disable camelcase -- terser's own API, which this speaks */

// terser's own entry point, main.js, as CommonJS: the two modules it reads for
// their effect, then `minify`. The rest of this directory is terser's lib at
// the release each file names, with only its module syntax rewritten.
require("./transform");
require("./mozilla-ast");

const { minify, minify_sync } = require("./minify");

module.exports = { minify, minify_sync };
