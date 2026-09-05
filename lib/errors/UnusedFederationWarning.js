/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/**
 * @typedef {object} UnusedFederationDetails
 * @property {string} name the share key or remote name, as declared
 * @property {"shared" | "remote"} kind which list declared it
 */

class UnusedFederationWarning extends WebpackError {
	/**
	 * Creates an instance of UnusedFederationWarning.
	 * @param {UnusedFederationDetails[]} entries the entries nothing used
	 */
	constructor(entries) {
		const list = entries
			.map((entry) => `\n  ${entry.name} (${entry.kind})`)
			.join("");

		super(
			`unused federation config: ${entries.length} ${entries.length === 1 ? "entry was" : "entries were"} declared but never used:${list}\nA 'shared' key nothing imports is not shared at all — each side keeps its own copy, which for a package holding state breaks at runtime rather than only costing bytes. A 'remotes' name nothing imports is usually misspelled, so the import that was meant to reach it resolved somewhere else.\nFor more info visit https://webpack.js.org/concepts/module-federation/`
		);

		/** @type {string} */
		this.name = "UnusedFederationWarning";
	}
}

module.exports = UnusedFederationWarning;
