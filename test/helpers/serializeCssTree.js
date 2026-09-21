"use strict";

// webpack's CSS nodes in the JSON form css-parsing-tests states its
// expectations in, so the corpus can be compared against rather than only run
// through. The shapes are upstream's; see its README for the representation.

const {
	NodeType,
	parseAListOfComponentValues
} = require("../../lib/css/syntax-parser");

/** The bracket a simple block opened with, as upstream names it. */
const BLOCK_NAMES = new Map([
	["{", "{}"],
	["[", "[]"],
	["(", "()"]
]);

/** A closer with nothing open is upstream's one error inside a value list. */
const STRAY_CLOSERS = new Map([
	[NodeType.RightParenthesis, ")"],
	[NodeType.RightSquareBracket, "]"],
	[NodeType.RightCurlyBracket, "}"]
]);

/** Upstream states a number's representation without its unit or `%` sign. */
const NUMBER_PREFIX = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;

/**
 * @param {EXPECTED_ANY} node a numeric component value
 * @returns {string} the source's own spelling of the number, unit excluded
 */
const representation = (node) => {
	const matched = NUMBER_PREFIX.exec(node.toString());
	return matched === null ? node.toString() : matched[0];
};

/**
 * A number token's value. `-0` and `0` are the same number and upstream's JSON
 * states the mathematical one, so the IEEE sign a token like `-0rgba()` carries
 * is not a difference to report.
 * @param {EXPECTED_ANY} node a numeric component value
 * @returns {number} the value upstream states
 */
const numericValue = (node) =>
	node.numericValue === 0 ? 0 : node.numericValue;

/**
 * A dimension's unit with its escapes resolved. The node states the whole
 * token unescaped rather than the unit alone, so the number's own spelling
 * comes off the front.
 * @param {EXPECTED_ANY} node a dimension
 * @returns {string} the unit
 */
const unescapedUnit = (node) => {
	const number = representation(node);
	const whole = node.unescaped;
	return whole.startsWith(number) ? whole.slice(number.length) : node.unit;
};

/**
 * One component value in upstream's JSON form. A preserved token is a bare
 * string and everything else a tagged array.
 * @param {EXPECTED_ANY} node a node from webpack's CSS parser
 * @returns {EXPECTED_ANY} the value upstream states for it
 */
const serializeComponentValue = (node) => {
	const stray = STRAY_CLOSERS.get(node.type);
	if (stray !== undefined) return ["error", stray];
	switch (node.type) {
		case NodeType.Ident:
			return ["ident", node.unescaped];
		case NodeType.AtKeyword:
			return ["at-keyword", node.unescaped];
		case NodeType.Hash:
			return ["hash", node.unescaped, node.typeFlag];
		case NodeType.String:
			return ["string", node.unescaped];
		case NodeType.BadString:
			return ["error", "bad-string"];
		case NodeType.Url:
			return ["url", node.unescaped];
		case NodeType.BadUrl:
			return ["error", "bad-url"];
		case NodeType.Number:
			return [
				"number",
				representation(node),
				numericValue(node),
				node.typeFlag
			];
		case NodeType.Percentage:
			return [
				"percentage",
				representation(node),
				numericValue(node),
				node.typeFlag
			];
		case NodeType.Dimension:
			return [
				"dimension",
				representation(node),
				numericValue(node),
				node.typeFlag,
				unescapedUnit(node)
			];
		case NodeType.Function:
			return [
				"function",
				node.unescapedName,
				...serializeComponentValues(node.value)
			];
		case NodeType.SimpleBlock:
			return [
				BLOCK_NAMES.get(node.toString()[0]),
				...serializeComponentValues(node.value)
			];
		// Whitespace collapses to one space however it was spelled, and every
		// other preserved token is written as itself.
		case NodeType.Whitespace:
			return " ";
		default:
			return node.toString();
	}
};

/**
 * @param {EXPECTED_ANY[]} nodes component values, comments included
 * @returns {EXPECTED_ANY[]} the list upstream states, comments dropped
 */
const serializeComponentValues = (nodes) => {
	const out = [];
	for (const node of nodes) {
		if (node.type === NodeType.Comment) continue;
		out.push(serializeComponentValue(node));
	}
	return out;
};

/**
 * @param {EXPECTED_ANY} node a declaration
 * @returns {EXPECTED_ANY} upstream's `["declaration", name, value, important]`
 */
const serializeDeclaration = (node) => [
	"declaration",
	node.unescapedName,
	serializeComponentValues(node.value),
	Boolean(node.important)
];

/**
 * A rule in upstream's form. webpack reads a block into declarations and child
 * rules rather than keeping the component values the spec states, so the block
 * is read back off the source it spans.
 * @param {EXPECTED_ANY} node an at-rule or qualified rule
 * @param {string} source the stylesheet the node was parsed from
 * @returns {EXPECTED_ANY} the value upstream states for it
 */
const serializeRule = (node, source) => {
	const prelude = serializeComponentValues(node.prelude);
	let contents = null;
	if (node.blockStart !== -1) {
		// The closer is absent on a block the source never closed, and the
		// contents then run to the end of what the block spans.
		const closed = source[node.blockEnd - 1] === "}";
		const inner = source.slice(
			node.blockStart + 1,
			closed ? node.blockEnd - 1 : node.blockEnd
		);
		contents = serializeComponentValues(parseAListOfComponentValues(inner));
	}
	return node.type === NodeType.AtRule
		? ["at-rule", node.unescapedName, prelude, contents]
		: ["qualified rule", prelude, contents];
};

module.exports = {
	serializeComponentValue,
	serializeComponentValues,
	serializeDeclaration,
	serializeRule
};
