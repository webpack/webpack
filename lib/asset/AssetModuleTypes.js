/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

/** @typedef {"asset" | "asset/inline" | "asset/resource" | "asset/source" | "asset/raw-data-url"} AssetModuleTypes */

/**
 * @type {Readonly<"asset">}
 * This is the module type used for automatically choosing between `asset/inline`, `asset/resource` based on asset size limit (8096).
 */
const ASSET_MODULE_TYPE = "asset";

/**
 * @type {Readonly<"asset/inline">}
 * This is the module type used for assets that are inlined as a data URI. This is the equivalent of `url-loader`.
 */
const ASSET_MODULE_TYPE_INLINE = "asset/inline";

/**
 * @type {Readonly<"asset/resource">}
 * This is the module type used for assets that are copied to the output directory. This is the equivalent of `file-loader`.
 */
const ASSET_MODULE_TYPE_RESOURCE = "asset/resource";

/**
 * @type {Readonly<"asset/source">}
 * This is the module type used for assets that are imported as source code. This is the equivalent of `raw-loader`.
 */
const ASSET_MODULE_TYPE_SOURCE = "asset/source";

/**
 * @type {Readonly<"asset/raw-data-url">}
 * TODO: Document what this asset type is for. See css-loader tests for its usage.
 */
const ASSET_MODULE_TYPE_RAW_DATA_URL = "asset/raw-data-url";

module.exports.ASSET_MODULE_TYPE = ASSET_MODULE_TYPE;
module.exports.ASSET_MODULE_TYPE_RAW_DATA_URL = ASSET_MODULE_TYPE_RAW_DATA_URL;
module.exports.ASSET_MODULE_TYPE_SOURCE = ASSET_MODULE_TYPE_SOURCE;
module.exports.ASSET_MODULE_TYPE_RESOURCE = ASSET_MODULE_TYPE_RESOURCE;
module.exports.ASSET_MODULE_TYPE_INLINE = ASSET_MODULE_TYPE_INLINE;
