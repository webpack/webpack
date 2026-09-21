/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

// TODO in the next major release: remove
// Some old plugins use `require("webpack/lib/EntryPlugin")`, in webpack@6 developer should migrate to `compiler.webpack.EntryPlugin`
module.exports = require("./entry/EntryPlugin");
