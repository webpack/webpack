"use strict";

// webpack's CSS nodes in the JSON form css-parsing-tests states its
// expectations in, so the corpus can be compared against rather than only run
// through. The shapes are upstream's; see its README for the representation.

const {
	A,
	Field,
	Flag,
	NodeType,
	Part,
	parseAListOfComponentValues
} = require("../../lib/css/syntax-parser");

/** The bracket a simple block opened with, as upstream names it. */
const BLOCK_NAMES = new Map([
	["{", "{}"],
	["[", "[]"],
	["(", "()"]
]);

/**
 * A closer with nothing open is upstream's one error inside a value list.
 * @type {Map<number, string>}
 */
const STRAY_CLOSERS = new Map([
	[NodeType.RightParenthesis, ")"],
	[NodeType.RightSquareBracket, "]"],
	[NodeType.RightCurlyBracket, "}"]
]);

/** Upstream states a number's representation without its unit or `%` sign. */
const NUMBER_PREFIX = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;

/**
 * @param {number} node a numeric component value
 * @returns {string} the source's own spelling of the number, unit excluded
 */
const representation = (node) => {
	const matched = NUMBER_PREFIX.exec(A.source(node));
	return matched === null ? A.source(node) : matched[0];
};

/**
 * A number token's value. `-0` and `0` are the same number and upstream's JSON
 * states the mathematical one, so the IEEE sign a token like `-0rgba()` carries
 * is not a difference to report.
 * @param {number} node a numeric component value
 * @returns {number} the value upstream states
 */
const numericValue = (node) => {
	const value = /** @type {number} */ (A.value(node));
	return value === 0 ? 0 : value;
};

/**
 * @param {number} node a numeric component value
 * @returns {"integer" | "number"} its type flag
 */
const typeFlag = (node) => (A.flag(Flag.integer, node) ? "integer" : "number");

/**
 * One component value in upstream's JSON form. A preserved token is a bare
 * string and everything else a tagged array.
 * @param {number} node a node from webpack's CSS parser
 * @returns {EXPECTED_ANY} the value upstream states for it
 */
const serializeComponentValue = (node) => {
	const type = A.type(node);
	const stray = STRAY_CLOSERS.get(type);
	if (stray !== undefined) return ["error", stray];
	switch (type) {
		case NodeType.Ident:
			return ["ident", A.value(node)];
		case NodeType.AtKeyword:
			return ["at-keyword", A.value(node)];
		case NodeType.Hash:
			return [
				"hash",
				A.value(node),
				A.flag(Flag.id, node) ? "id" : "unrestricted"
			];
		case NodeType.String:
			return ["string", A.value(node)];
		case NodeType.BadString:
			return ["error", "bad-string"];
		case NodeType.Url:
			return ["url", A.value(node)];
		case NodeType.BadUrl:
			return ["error", "bad-url"];
		case NodeType.Number:
		case NodeType.Percentage:
			return [
				type === NodeType.Number ? "number" : "percentage",
				representation(node),
				numericValue(node),
				typeFlag(node)
			];
		case NodeType.Dimension:
			return [
				"dimension",
				representation(node),
				numericValue(node),
				typeFlag(node),
				A.name(node)
			];
		case NodeType.Function:
			return [
				"function",
				A.name(node),
				...serializeComponentValues(A.children(node))
			];
		case NodeType.SimpleBlock:
			return [
				BLOCK_NAMES.get(/** @type {string} */ (A.value(node))),
				...serializeComponentValues(A.children(node))
			];
		// Whitespace collapses to one space however it was spelled, and every
		// other preserved token is written as itself.
		case NodeType.Whitespace:
			return " ";
		default:
			return A.source(node);
	}
};

/**
 * @param {number[]} nodes component values, comments included
 * @returns {EXPECTED_ANY[]} the list upstream states, comments dropped
 */
const serializeComponentValues = (nodes) => {
	const out = [];
	for (const node of nodes) {
		if (A.type(node) === NodeType.Comment) continue;
		out.push(serializeComponentValue(node));
	}
	return out;
};

/**
 * @param {number} node a declaration
 * @returns {EXPECTED_ANY} upstream's `["declaration", name, value, important]`
 */
const serializeDeclaration = (node) => [
	"declaration",
	A.name(node),
	serializeComponentValues(A.children(node)),
	A.flag(Flag.important, node)
];

/**
 * Rules in upstream's form. webpack reads a block into declarations and child
 * rules rather than keeping the component values the spec states, so each block
 * is parsed again from its source once every rule is read, a parse ending refs.
 * @param {number[]} nodes at-rules and qualified rules
 * @param {string} source the stylesheet the nodes were parsed from
 * @returns {EXPECTED_ANY[]} the value upstream states for each
 */
const serializeRules = (nodes, source) => {
	const read = nodes.map((node) => ({
		atRule: A.type(node) === NodeType.AtRule,
		name: A.name(node),
		prelude: serializeComponentValues(A.children(node)),
		blockStart: A.startOf(Part.block, node),
		blockEnd: A.endOf(Part.block, node)
	}));
	return read.map(({ atRule, name, prelude, blockStart, blockEnd }) => {
		let contents = null;
		if (blockStart !== -1) {
			// The closer is absent on a block the source never closed, and the
			// contents then run to the end of what the block spans.
			const closed = source[blockEnd - 1] === "}";
			const inner = source.slice(
				blockStart + 1,
				closed ? blockEnd - 1 : blockEnd
			);
			contents = serializeComponentValues(parseAListOfComponentValues(inner));
		}
		return atRule
			? ["at-rule", name, prelude, contents]
			: ["qualified rule", prelude, contents];
	});
};

/**
 * @param {number} stylesheet a stylesheet
 * @param {string} source what it was parsed from
 * @returns {EXPECTED_ANY[]} its rules in upstream's form
 */
const serializeStylesheet = (stylesheet, source) => {
	/** @type {number[]} */
	const rules = [];
	for (
		let i = 0, count = A.fieldCount(Field.rules, stylesheet);
		i < count;
		i++
	) {
		rules.push(A.field(i, Field.rules, stylesheet));
	}
	return serializeRules(rules, source);
};

module.exports = {
	serializeComponentValue,
	serializeComponentValues,
	serializeDeclaration,
	serializeRules,
	serializeStylesheet
};
