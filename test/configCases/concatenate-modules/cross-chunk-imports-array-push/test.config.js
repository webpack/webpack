"use strict";

const fs = require("fs");
const path = require("path");

/** @import { Configuration } from "../../../../" */

module.exports = {
	findBundle() {
		return ["bundle0.mjs"];
	},
	afterExecute(options) {
		const dir = /** @type {string} */ (
			/** @type {NonNullable<Configuration["output"]>} */ (
				/** @type {Configuration} */ (options).output
			).path
		);
		const shared = fs.readFileSync(path.join(dir, "shared.chunk.js"), "utf8");
		const pageB = fs.readFileSync(path.join(dir, "page-b.chunk.js"), "utf8");
		// only the module chunk format renders a linked scope
		expect(shared).toContain("const formatValue = ");
		expect(pageB).not.toContain("__webpack_linked_");
	}
};
