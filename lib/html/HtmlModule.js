/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const NormalModule = require("../NormalModule");
const makeSerializable = require("../util/makeSerializable");

/**
 * Module class for `html` modules. HTML-specific properties should live here instead of `NormalModule`.
 */
class HtmlModule extends NormalModule {}

makeSerializable(HtmlModule, "webpack/lib/html/HtmlModule");

module.exports = HtmlModule;
