/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const NormalModule = require("../NormalModule");
const makeSerializable = require("../util/makeSerializable");

/**
 * Module class for all `javascript/*` modules. JavaScript-specific properties should live here instead of `NormalModule`.
 */
class JavascriptModule extends NormalModule {}

makeSerializable(JavascriptModule, "webpack/lib/javascript/JavascriptModule");

module.exports = JavascriptModule;
