/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/** @typedef {typeof import("./syntax-parser")} SyntaxParser */
/** @typedef {typeof import("./syntax-printer")} SyntaxPrinter */
/** @typedef {import("./ScopeAnalyzer").ScopeAnalysis} ScopeAnalysis */

/**
 * The scope analysis of a program the parser wrote, and what it hands back.
 * @typedef {object} JavascriptScopes
 * @property {(program: number, recordEveryReference?: boolean) => ScopeAnalysis} analyzeScope analyzes a program of the tree `A` reads, from the log a parse with `scopes` kept, else by walking the tree
 * @property {SyntaxParser["ScopeLog"]} ScopeLog what a parse with `scopes` records into; one passed in is refilled, so one can serve every parse
 * @property {typeof import("./ScopeAnalyzer").Scope} Scope a lexical scope
 * @property {typeof import("./ScopeAnalyzer").Variable} Variable a name one scope declares
 * @property {typeof import("./ScopeAnalyzer").Reference} Reference one read of a name
 * @property {typeof import("./ScopeAnalyzer").ScopeIdentifier} ScopeIdentifier one occurrence of a name, by its offsets
 */

/** @type {SyntaxParser | undefined} */
let _parser;
/** @type {JavascriptScopes | undefined} */
let _scopes;

/**
 * JavaScript's two halves, as `css` and `html` name theirs, are reached through
 * getters: parsing never loads the printer, nor the minifier behind it.
 * @returns {SyntaxParser} the parser half
 */
const parser = () => _parser || (_parser = require("./syntax-parser"));

/**
 * The scope analysis, loaded on first use, so a build that never concatenates
 * never loads it.
 * @returns {JavascriptScopes} the analysis and its classes
 */
const scopes = () => {
	if (_scopes === undefined) {
		const analyzeScope = require("./ScopeAnalyzer");

		_scopes = {
			analyzeScope,
			ScopeLog: parser().ScopeLog,
			Scope: analyzeScope.Scope,
			Variable: analyzeScope.Variable,
			Reference: analyzeScope.Reference,
			ScopeIdentifier: analyzeScope.ScopeIdentifier
		};
	}
	return _scopes;
};

module.exports = {
	/**
	 * @returns {SyntaxParser} the parser
	 * @experimental exposed as `webpack.javascript.syntax.parser`; unstable API
	 */
	get parser() {
		return parser();
	},
	/**
	 * @returns {SyntaxPrinter} the printer
	 * @experimental exposed as `webpack.javascript.syntax.printer`; unstable API
	 */
	get printer() {
		return require("./syntax-printer");
	},
	/**
	 * @returns {SyntaxParser["toEstreeObject"]} builds a node's ESTree object
	 * @experimental exposed as `webpack.javascript.syntax.toEstreeObject`; unstable API
	 */
	get toEstreeObject() {
		return parser().toEstreeObject;
	},
	/**
	 * Usage: `const { analyzeScope } = webpack.javascript.syntax.scopes;
	 * analyzeScope(parser.parseProgram(code, 0, { scopes: true }))`.
	 * @experimental exposed as `webpack.javascript.syntax.scopes`; unstable API
	 * @returns {JavascriptScopes} the scope analysis
	 */
	get scopes() {
		return scopes();
	},
	/**
	 * @returns {typeof import("./JavascriptSourceProcessor")} the source processor class
	 * @experimental exposed as `webpack.javascript.syntax.SourceProcessor`; unstable API
	 */
	get SourceProcessor() {
		// a getter, so a parse never loads the visitor coordinator
		return require("./JavascriptSourceProcessor");
	}
};
