/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const CommentCompilationWarning = require("../CommentCompilationWarning");

/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../javascript/JavascriptParser").ExportAllDeclaration} ExportAllDeclaration */
/** @typedef {import("../javascript/JavascriptParser").ExportNamedDeclaration} ExportNamedDeclaration */
/** @typedef {import("../javascript/JavascriptParser").ImportDeclaration} ImportDeclaration */
/** @typedef {import("../javascript/JavascriptParser").ImportExpression} ImportExpression */

const IMPORT_PHASE_EVALUATION = Symbol.for("evaluation");
const IMPORT_PHASE_DEFER = Symbol.for("defer");
const IMPORT_PHASE_SOURCE = Symbol.for("source");

/**
 * @typedef {typeof IMPORT_PHASE_DEFER | typeof IMPORT_PHASE_SOURCE | typeof IMPORT_PHASE_EVALUATION} ImportPhase
 */

/**
 * @typedef {object} ImportPhaseUtils
 * @property {(phase: ImportPhase | undefined) => boolean} isDefer returns true when the phase is `defer`
 * @property {(phase: ImportPhase | undefined) => boolean} isSource returns true when the phase is `source`
 */

/** @type {ImportPhaseUtils} */
const ImportPhaseUtils = Object.freeze({
	isDefer(phase) {
		return phase === IMPORT_PHASE_DEFER;
	},
	isSource(phase) {
		return phase === IMPORT_PHASE_SOURCE;
	}
});

/**
 * @typedef {() => Record<string, EXPECTED_ANY> | null} GetCommentOptions
 */

/**
 * @callback GetImportPhase
 * @param {JavascriptParser} parser parser
 * @param {ExportNamedDeclaration | ExportAllDeclaration | ImportDeclaration | ImportExpression} node node
 * @param {GetCommentOptions=} getCommentOptions optional function that returns the comment options object.
 * @returns {ImportPhase} import phase
 */

/**
 * @param {boolean=} enableImportPhase enable import phase detection
 * @returns {GetImportPhase} evaluates the import phase for ast node
 */
function createGetImportPhase(enableImportPhase) {
	return (parser, node, getCommentOptions) => {
		if (!enableImportPhase) return IMPORT_PHASE_EVALUATION;

		// We now only support `defer import`
		const phaseBySyntax =
			"phase" in node && node.phase === "defer"
				? IMPORT_PHASE_DEFER
				: IMPORT_PHASE_EVALUATION;

		if (!node.range) {
			return phaseBySyntax;
		}

		getCommentOptions =
			getCommentOptions ||
			(() => {
				if (!node.range) return null;
				const { options, errors } = parser.parseCommentOptions(node.range);
				if (errors) {
					for (const e of errors) {
						const { comment } = e;
						if (!comment.loc) continue;
						parser.state.module.addWarning(
							new CommentCompilationWarning(
								`Compilation error while processing magic comment(-s): /*${comment.value}*/: ${e.message}`,
								comment.loc
							)
						);
					}
				}
				return options;
			});

		const options = getCommentOptions();

		if (!options || !options.webpackDefer) return phaseBySyntax;

		const { webpackDefer } = options;
		if (typeof webpackDefer === "boolean") {
			return webpackDefer ? IMPORT_PHASE_DEFER : phaseBySyntax;
		} else if (node.loc) {
			parser.state.module.addWarning(
				new CommentCompilationWarning(
					"webpackDefer magic comment expected a boolean value.",
					node.loc
				)
			);
		}

		return phaseBySyntax;
	};
}

module.exports = {
	IMPORT_PHASE_DEFER,
	IMPORT_PHASE_EVALUATION,
	IMPORT_PHASE_SOURCE,
	ImportPhaseUtils,
	createGetImportPhase
};
