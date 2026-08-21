/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const NormalModule = require("../NormalModule");
const makeSerializable = require("../util/makeSerializable");

/**
 * @import {
 * 	NormalModuleBuildInfo,
 * 	NormalModuleCreateData
 * } from "../NormalModule"
 */
/** @import { HtmlEntryInfo } from "./HtmlModulesPlugin" */

/**
 * Defines the build info properties specific to html modules.
 * @typedef {object} KnownHtmlModuleBuildInfo
 * @property {Record<string, HtmlEntryInfo[]>=} htmlEntries entries collected from the document, grouped by kind
 * @property {string=} baseUrlPrefix `../` per `<base href>` path segment, prepended to the auto-public-path undo path so a relative base doesn't misdirect bundled URLs
 */

/** @typedef {NormalModuleBuildInfo & KnownHtmlModuleBuildInfo} HtmlModuleBuildInfo */

/**
 * Module class for `html` modules. HTML-specific properties should live here instead of `NormalModule`.
 */
class HtmlModule extends NormalModule {
	/**
	 * @param {NormalModuleCreateData} options options object
	 */
	constructor(options) {
		super(options);

		// Redeclared with the html specific shape
		/** @type {HtmlModuleBuildInfo | undefined} */
		this.buildInfo = undefined;
	}
}

makeSerializable(HtmlModule, "webpack/lib/html/HtmlModule");

module.exports = HtmlModule;
