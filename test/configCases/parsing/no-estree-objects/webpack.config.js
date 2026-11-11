"use strict";

const webpack = require("../../../../");
const BasicEvaluatedExpression = require("../../../../lib/javascript/BasicEvaluatedExpression");
const {
	_SyntaxTree: SyntaxTree
} = require("../../../../lib/javascript/syntax-parser");

/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../").javascript.JavascriptParser} JavascriptParser */

const PLUGIN_NAME = "no-estree-objects";

/**
 * Fails the build when parsing makes an ESTree object for any node: every
 * object starts at the tree's `estree`/`lazyEstree` or an evaluation's
 * `expression`, which this wraps for the compilation.
 * @param {Compiler} compiler the compiler
 * @returns {void}
 */
const noEstreeObjects = (compiler) => {
	/** @type {string[]} */
	const made = [];
	let parsed = 0;
	/** @type {string | undefined} */
	let current;
	const { estree: originalEstree, lazyEstree: originalLazyEstree } =
		SyntaxTree.prototype;
	const expression = /** @type {PropertyDescriptor} */ (
		Object.getOwnPropertyDescriptor(
			BasicEvaluatedExpression.prototype,
			"expression"
		)
	);
	const get = /** @type {() => unknown} */ (expression.get);
	/**
	 * Records where the module being parsed asked for an object.
	 * @param {string} entry the method asked
	 * @returns {void}
	 */
	const record = (entry) => {
		const frame = String(new Error("made").stack)
			.split("\n")
			.slice(3)
			.find((line) => !/syntax-parser|BasicEvaluatedExpression/.test(line));
		made.push(`${current}: ${entry} at ${frame && frame.trim()}`);
	};
	compiler.hooks.thisCompilation.tap(
		PLUGIN_NAME,
		(compilation, { normalModuleFactory }) => {
			// node `0` stands for none: asking for it prepares the source, builds nothing
			SyntaxTree.prototype.estree = function estree(
				/** @type {number} */ node,
				/** @type {string[] | undefined} */ fields
			) {
				if (node !== 0) record("estree");
				return originalEstree.call(this, node, fields);
			};
			SyntaxTree.prototype.lazyEstree = function lazyEstree(
				/** @type {number} */ node
			) {
				if (node !== 0) record("lazyEstree");
				return originalLazyEstree.call(this, node);
			};
			Object.defineProperty(BasicEvaluatedExpression.prototype, "expression", {
				...expression,
				get() {
					if (typeof this._expression === "number") record("expression");
					return get.call(this);
				}
			});
			/**
			 * Counts the parses and names the module each one reads.
			 * @param {JavascriptParser} parser the parser
			 * @returns {void}
			 */
			const onParser = (parser) => {
				parser.hooks.program.tap({ name: PLUGIN_NAME, path: true }, () => {
					parsed++;
					current = parser.state.module.resource.replace(__dirname, ".");
				});
			};
			const { parser } = normalModuleFactory.hooks;
			parser.for("javascript/auto").tap(PLUGIN_NAME, onParser);
			parser.for("javascript/esm").tap(PLUGIN_NAME, onParser);
			parser.for("javascript/dynamic").tap(PLUGIN_NAME, onParser);
			compilation.hooks.finishModules.tap(PLUGIN_NAME, () => {
				// a build restored from the cache parses nothing
				if (parsed === 0 || made.length === 0) return;
				compilation.errors.push(
					new webpack.WebpackError(`ESTree objects made:\n${made.join("\n")}`)
				);
			});
		}
	);
	/**
	 * Puts the wrapped methods back.
	 * @returns {void}
	 */
	const restore = () => {
		SyntaxTree.prototype.estree = originalEstree;
		SyntaxTree.prototype.lazyEstree = originalLazyEstree;
		Object.defineProperty(
			BasicEvaluatedExpression.prototype,
			"expression",
			expression
		);
	};
	compiler.hooks.done.tap(PLUGIN_NAME, restore);
	compiler.hooks.failed.tap(PLUGIN_NAME, restore);
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	plugins: [
		noEstreeObjects,
		new webpack.HotModuleReplacementPlugin(),
		new webpack.DefinePlugin({
			DEFINED: JSON.stringify("defined"),
			"process.env.FLAG": "true"
		}),
		new webpack.ProvidePlugin({ provided: ["./cjs.js", "value"] })
	]
};
