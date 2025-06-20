/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @TheLarkInn
*/

"use strict";

const asset = require("./asset/AssetModuleTypes");
const css = require("./css/CssModuleTypes");
const javascript = require("./javascript/JavascriptModuleTypes");
const json = require("./json/JsonModuleTypes");
const wasm = require("./wasm/WasmModuleTypes");

/** @typedef {import("./javascript/JavascriptModuleTypes").JavaScriptModuleTypes} JavaScriptModuleTypes */
/** @typedef {import("./javascript/JavascriptModuleTypes").WebpackModuleTypes} WebpackModuleTypes */
/** @typedef {import("./json/JsonModuleTypes").JSONModuleTypes} JSONModuleTypes */
/** @typedef {import("./asset/AssetModuleTypes").AssetModuleTypes} AssetModuleTypes */
/** @typedef {import("./wasm/WasmModuleTypes").WebAssemblyModuleTypes} WebAssemblyModuleTypes */
/** @typedef {string} UnknownModuleTypes */

/** @typedef {JavaScriptModuleTypes | JSONModuleTypes | AssetModuleTypes | WebAssemblyModuleTypes | WebpackModuleTypes | UnknownModuleTypes} ModuleTypes */

const JAVASCRIPT_MODULES = [
	javascript.JAVASCRIPT_MODULE_TYPE_AUTO,
	javascript.JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	javascript.JAVASCRIPT_MODULE_TYPE_ESM
];

const JAVASCRIPT_RELATED_MODULES = new Set(Object.values(javascript));

const CSS_MODULES = new Set(Object.values(css));

module.exports = {
	...javascript,
	...css,
	...wasm,
	...json,
	...asset,
	JAVASCRIPT_MODULES,
	JAVASCRIPT_RELATED_MODULES,
	CSS_MODULES
};
