/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// TODO in the next major release: remove
// Some old plugins use `require("webpack/lib/ModuleFactory")`, in the next major release developer should migrate to `compiler.webpack.ModuleFactory`
module.exports = require("./module/ModuleFactory");
