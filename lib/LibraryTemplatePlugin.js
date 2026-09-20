/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

// TODO remove in webpack 6
// Some old plugins use `require("webpack/lib/LibraryTemplatePlugin")`, in webpack@6 developer should migrate to `compiler.webpack.LibraryTemplatePlugin`
module.exports = require("./library/LibraryTemplatePlugin");
