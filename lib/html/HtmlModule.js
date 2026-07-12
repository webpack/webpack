/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

import NormalModule from "../NormalModule.js";
import makeSerializable from "../util/makeSerializable.js";
/** @typedef {import("../NormalModule.js").NormalModuleBuildInfo} NormalModuleBuildInfo */
/** @typedef {import("../NormalModule.js").NormalModuleCreateData} NormalModuleCreateData */
/** @typedef {import("./HtmlModulesPlugin.js").HtmlEntryInfo} HtmlEntryInfo */

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

export default HtmlModule;

export { HtmlModule as "module.exports" };
