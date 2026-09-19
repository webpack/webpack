/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

// TODO remove in webpack 6
// Some old plugins use `require("webpack/lib/DependencyTemplate")`; it is not on
// `compiler.webpack`, so in webpack@6 they should require `webpack/lib/template/DependencyTemplate`
module.exports = require("./template/DependencyTemplate");
