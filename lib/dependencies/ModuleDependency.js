/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// TODO in the next major release: remove
// Some old plugins use `require("webpack/lib/dependencies/ModuleDependency")`, in the next major release developer should migrate to `compiler.webpack.dependencies.ModuleDependency`
module.exports = require("./core/ModuleDependency");
