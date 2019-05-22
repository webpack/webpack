/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { tokTypes: tt } = require("acorn");

const empty = [];

module.exports = Parser => {
	return class extends Parser {
		parseImport(node) {
			this.next();
			// import await '...'
			if (this.type === tt.name) {
				if (this.value === "await") {
					node.await = true;
					this.next();
				} else {
					this.unexpected();
				}
			} else {
				node.await = false;
			}
			this.pos = this.start;
			return super.parseImport(node);
		}
		parseExport(node) {
			this.next();
			// import await '...'
			if (this.type === tt.name) {
				if (this.value === "await") {
					node.await = true;
					this.next();
				} else {
					this.unexpected();
				}
			} else {
				node.await = false;
			}
			this.pos = this.start;
			const result = super.parseExport(node);
			if (node.await && !node.source) {
				this.raiseRecoverable(
					node.start,
					"Missing from source in export await"
				);
			}
			return result;
		}
	};
};
