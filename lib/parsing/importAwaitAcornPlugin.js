/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { tokTypes: tt } = require("acorn");

/** @typedef {typeof import("acorn").Parser} Parser */

/**
 * @param {Parser} P the acorn parser
 * @returns {Parser} new acorn parser
 */
module.exports = P => {
	const Base = /** @type {any} */ (P);
	const NewParser = /** @type {unknown} */ (class extends Base {
		parseImport(node) {
			this.next();
			// import await '...'
			if (this.type === tt.name && this.value === "await") {
				node.await = true;
			} else {
				node.await = false;
				this.pos = this.start;
			}
			return super.parseImport(node);
		}
		parseExport(node) {
			this.next();
			// export await '...'
			if (this.type === tt.name && this.value === "await") {
				node.await = true;
			} else {
				node.await = false;
				this.pos = this.start;
			}
			const result = super.parseExport(node);
			if (node.await && !node.source) {
				this.raiseRecoverable(
					node.start,
					"Missing from source in export await"
				);
			}
			return result;
		}
	});
	return /** @type {Parser} */ (NewParser);
};
