/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const NormalModule = require("../NormalModule");
const makeSerializable = require("../util/makeSerializable");

/**
 * Module class for `json` modules. JSON-specific properties should live here instead of `NormalModule`.
 */
class JsonModule extends NormalModule {}

makeSerializable(JsonModule, "webpack/lib/json/JsonModule");

module.exports = JsonModule;
