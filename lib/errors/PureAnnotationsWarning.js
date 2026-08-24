/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/**
 * @typedef {object} PureAnnotationDetails
 * @property {string} name the module, shortened for the report
 * @property {number} count how many of its annotations do nothing
 */

class PureAnnotationsWarning extends WebpackError {
	/**
	 * Creates an instance of PureAnnotationsWarning.
	 * @param {PureAnnotationDetails[]} modules the worst offenders, most first
	 * @param {number} total how many annotations do nothing in all
	 */
	constructor(modules, total) {
		const list = modules
			.map((module) => `\n  ${module.name} (${module.count})`)
			.join("");

		super(
			`pure annotations: ${total} '/*#__PURE__*/' ${total === 1 ? "annotation does" : "annotations do"} nothing:${list}\nThe annotation is read only where it sits directly before a call, a 'new', or a tagged template — anywhere else it is a comment, and the code it was meant to make droppable is kept.\nFor more info visit https://webpack.js.org/guides/tree-shaking/`
		);

		/** @type {string} */
		this.name = "PureAnnotationsWarning";
	}
}

module.exports = PureAnnotationsWarning;
