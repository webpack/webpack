/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

// TODO remove in webpack 6
// Some old plugins use `require("webpack/lib/ModuleFilenameHelpers")`, in webpack@6 developer should migrate to `compiler.webpack.ModuleFilenameHelpers`
module.exports = require("./devtool/ModuleFilenameHelpers");
