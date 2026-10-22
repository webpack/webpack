/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

// TODO in the next major release: remove
// Some old plugins use `require("webpack/lib/EntryPlugin")`, in the next major release developer should migrate to `compiler.webpack.EntryPlugin`
module.exports = require("./entry/EntryPlugin");
