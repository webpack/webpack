/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// TODO in the next major release: remove
// Some old plugins use `require("webpack/lib/RuntimeModule")`, in the next major release developer should migrate to `compiler.webpack.runtime.RuntimeModule`
module.exports = require("./runtime/RuntimeModule");
