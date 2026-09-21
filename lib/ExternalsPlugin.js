/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

// TODO in the next major release: remove
// Some old plugins use `require("webpack/lib/ExternalsPlugin")`, in webpack@6 developer should migrate to `compiler.webpack.ExternalsPlugin`
module.exports = require("./externals/ExternalsPlugin");
