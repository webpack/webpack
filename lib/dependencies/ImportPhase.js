/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const memoize = require("../util/memoize");

const getCommentCompilationWarning = memoize(() =>
	require("../CommentCompilationWarning")
);

/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../javascript/JavascriptParser").ExportAllDeclaration} ExportAllDeclaration */
/** @typedef {import("../javascript/JavascriptParser").ExportNamedDeclaration} ExportNamedDeclaration */
/** @typedef {import("../javascript/JavascriptParser").ImportDeclaration} ImportDeclaration */
/** @typedef {import("../javascript/JavascriptParser").ImportExpression} ImportExpression */

/** @typedef {typeof ImportPhase.Evaluation | typeof ImportPhase.Defer | typeof ImportPhase.Source}  ImportPhaseType */

const ImportPhase = Object.freeze({
	Evaluation: 0b00,
	Defer: 0b01,
	Source: 0b10
});

/**
 * @typedef {object} ImportPhaseUtils
 * @property {(phase: ImportPhaseType) => boolean} isEvaluation true if phase is evaluation
 * @property {(phase: ImportPhaseType) => boolean} isDefer true if phase is defer
 * @property {(phase: ImportPhaseType) => boolean} isSource true if phase is source
 */

/** @type {ImportPhaseUtils} */
const ImportPhaseUtils = {
	isEvaluation(phase) {
		return phase === ImportPhase.Evaluation;
	},
	isDefer(phase) {
		return phase === ImportPhase.Defer;
	},
	isSource(phase) {
		return phase === ImportPhase.Source;
	}
};

/**
 * @typedef {() => Record<string, EXPECTED_ANY> | null} GetCommentOptions
 */

/**
 * @callback GetImportPhase
 * @param {JavascriptParser} parser parser
 * @param {ExportNamedDeclaration | ExportAllDeclaration | ImportDeclaration | ImportExpression} node node
 * @param {GetCommentOptions=} getCommentOptions optional function that returns the comment options object.
 * @returns {ImportPhaseType} import phase
 */

/**
 * @param {boolean=} enableImportPhase enable import phase detection
 * @returns {GetImportPhase} evaluates the import phase for ast node
 */
function createGetImportPhase(enableImportPhase) {
	return (parser, node, getCommentOptions) => {
		if (!enableImportPhase) return ImportPhase.Evaluation;

		// We now only support `defer import`
		const phaseBySyntax =
			"phase" in node && node.phase === "defer"
				? ImportPhase.Defer
				: ImportPhase.Evaluation;

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

						const CommentCompilationWarning = getCommentCompilationWarning();
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
			return webpackDefer ? ImportPhase.Defer : phaseBySyntax;
		} else if (node.loc) {
			const CommentCompilationWarning = getCommentCompilationWarning();
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
	ImportPhase,
	ImportPhaseUtils,
	createGetImportPhase
};
