/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

// TODO in the next major release: remove
// Some old plugins use `require("webpack/lib/DependencyTemplate")`; it is not on
// `compiler.webpack`, so in the next major release they should require `webpack/lib/template/DependencyTemplate`
module.exports = require("./template/DependencyTemplate");
