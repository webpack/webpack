/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

// TODO in the next major release: remove
// Some old plugins use `require("webpack/lib/dependencies/ContextElementDependency")`;
// it is not on `compiler.webpack`, so in the next major release they should
// require `webpack/lib/dependencies/context/ContextElementDependency`
module.exports = require("./context/ContextElementDependency");
