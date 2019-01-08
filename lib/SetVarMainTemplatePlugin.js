/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const { ConcatSource } = require("webpack-sources");
const {
	resolveTargetName: resolveTargetVarExpression,
	updateHashPath
} = require("./util/templatePlugin");

/** @typedef {import("./Compilation")} Compilation */

class SetVarMainTemplatePlugin {
	/**
	 * @param {string|Function} varExpression the accessor where the library is exported
	 * @param {boolean} copyObject specify copying the exports
	 */
	constructor(varExpression, copyObject) {
		/** @type {string|Function} */
		this.varExpression = varExpression;
		/** @type {boolean} */
		this.copyObject = copyObject;
	}

	/**
	 * @param {Compilation} compilation the compilation instance
	 * @returns {void}
	 */
	apply(compilation) {
		const { mainTemplate, chunkTemplate } = compilation;

		const onRenderWithEntry = (source, chunk, hash) => {
			const varExpression = resolveTargetVarExpression(
				mainTemplate,
				this.varExpression,
				chunk,
				hash
			);
			if (this.copyObject) {
				return new ConcatSource(
					`(function(e, a) { for(var i in a) e[i] = a[i]; }(${varExpression}, `,
					source,
					"))"
				);
			} else {
				const prefix = `${varExpression} =\n`;
				return new ConcatSource(prefix, source);
			}
		};

		for (const template of [mainTemplate, chunkTemplate]) {
			template.hooks.renderWithEntry.tap(
				"SetVarMainTemplatePlugin",
				onRenderWithEntry
			);
		}

		mainTemplate.hooks.globalHashPaths.tap(
			"SetVarMainTemplatePlugin",
			paths => {
				updateHashPath(compilation, this.varExpression, paths);
				return paths;
			}
		);
		mainTemplate.hooks.hashForChunk.tap(
			"SetVarMainTemplatePlugin",
			(hash, chunk) => {
				const varExpression = resolveTargetVarExpression(
					mainTemplate,
					this.varExpression,
					chunk,
					hash
				);
				hash.update("set var");
				hash.update(`${varExpression}`);
				hash.update(`${this.copyObject}`);
			}
		);
	}
}

module.exports = SetVarMainTemplatePlugin;
