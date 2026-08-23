/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/**
 * @typedef {object} MixedExportsDetails
 * @property {string} name the entry, by name
 * @property {string[]} named the named exports sitting beside the default
 */

class MixedExportsWarning extends WebpackError {
	/**
	 * Creates an instance of MixedExportsWarning.
	 * @param {MixedExportsDetails[]} entries the entries that mix them
	 * @param {string} type the library type they are built for
	 */
	constructor(entries, type) {
		const list = entries
			.map(
				(entry) =>
					`\n  ${entry.name} (default and ${entry.named.length}: ${entry.named
						.slice(0, 3)
						.join(", ")}${entry.named.length > 3 ? ", …" : ""})`
			)
			.join("");

		super(
			`mixed exports: ${entries.length} ${entries.length === 1 ? "entry exports" : "entries export"} a default beside named exports for the '${type}' library:${list}\nA consumer calling 'require()' gets the namespace object, so the default arrives as '.default' rather than as the value itself. Exporting only a default, or only named exports, leaves no ambiguity — 'output.library.export' can also pick one.\nFor more info visit https://webpack.js.org/configuration/output/#outputlibraryexport`
		);

		/** @type {string} */
		this.name = "MixedExportsWarning";
	}
}

module.exports = MixedExportsWarning;
