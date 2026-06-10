/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const NormalModule = require("../NormalModule");
const makeSerializable = require("../util/makeSerializable");

/**
 * Module class for all `asset/*` modules. Asset-specific properties should live here instead of `NormalModule`.
 */
class AssetModule extends NormalModule {}

makeSerializable(AssetModule, "webpack/lib/asset/AssetModule");

module.exports = AssetModule;
