/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

// TODO in the next major release: remove
// Some old plugins use `require("webpack/lib/DependencyTemplate")`, in the next major release developer should migrate to `compiler.webpack.template.DependencyTemplate`
module.exports = require("./template/DependencyTemplate");
