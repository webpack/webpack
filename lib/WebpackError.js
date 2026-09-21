/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Jarid Margolin @jaridmargolin
*/

"use strict";

// TODO in the next major release: remove
// Some old plugins use `require("webpack/lib/WebpackError")`, in the next major release developer should migrate to `compiler.webpack.WebpackError`
module.exports = require("./errors/WebpackError");
