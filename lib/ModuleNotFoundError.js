/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

// TODO remove in webpack 6
// Some old plugins use `require("webpack/lib/ModuleNotFoundError")`, in webpack@6 developer should migrate to `compiler.webpack.ModuleNotFoundError`
module.exports = require("./errors/ModuleNotFoundError");
