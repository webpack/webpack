"use strict";

const { parser } = require("../../../../lib/javascript/syntax");

/**
 * @param {string} source a module
 * @returns {EXPECTED_ANY} its ESTree program, as another parser would hand it over
 */
const estreeOf = (source) =>
	parser.parse(source, {
		ecmaVersion: "latest",
		sourceType: "module",
		ranges: true
	});

/**
 * @param {EXPECTED_ANY} node an ESTree node
 * @param {(node: EXPECTED_ANY) => void} fn called for it and every node in it
 * @returns {void}
 */
const eachNode = (node, fn) => {
	fn(node);
	for (const key of Object.keys(node)) {
		const value = node[key];
		for (const item of Array.isArray(value) ? value : [value]) {
			if (item !== null && typeof item === "object" && "type" in item) {
				eachNode(item, fn);
			}
		}
	}
};

/**
 * Leaves out what ESTree lets another parser leave out: a string's `raw`, an
 * array's `start` and `end` (its `range` kept), an object's `start` and `range`.
 * @param {EXPECTED_ANY} node an ESTree node
 * @returns {void}
 */
const loosen = (node) => {
	if (node.type === "Literal" && node.value === "s") delete node.raw;
	if (node.type === "ArrayExpression") {
		delete node.start;
		delete node.end;
	}
	if (node.type === "ObjectExpression") {
		delete node.start;
		delete node.range;
	}
};

/**
 * @param {EXPECTED_ANY} inner the innermost node
 * @param {number} depth how many `!` wrap it
 * @returns {EXPECTED_ANY} the `!` chain, deeper than the writer recurses
 */
const negations = (inner, depth) => {
	let node = inner;
	for (let i = 0; i < depth; i++) {
		node = { type: "UnaryExpression", operator: "!", prefix: true, argument: node, start: 0, end: 1 };
	}
	return node;
};

/**
 * An ESTree program another parser built, written into a syntax tree as a
 * loader's AST is, reads back as the objects it was given; offsets come from
 * `range` where `start` and `end` are missing, a literal's `raw` from the text,
 * and a node type the tree lacks is left out.
 * @param {string[]} values what the run answers
 * @param {{ source: string }} context the fixture's input
 * @returns {Record<string, unknown>} what the written tree reads back
 */
const roundTrip = (values, { source }) => {
	const program = estreeOf(source);
	const call = program.body.find(
		(statement) =>
			statement.type === "ExpressionStatement" &&
			statement.expression.type === "CallExpression"
	).expression;
	// A node of a type no tree holds, as a plugin's parser may add.
	call.arguments.push({ type: "JSXText", start: 0, end: 0 });
	// Nested past the depth the writer recurses to, the rest is written in order.
	const deep = estreeOf(`!f(1, "s", [, d], { p: d }, null, e);`).body[0];
	const deepArguments = deep.expression.argument.arguments;
	// An end with no `range` to read it from is 0.
	delete deepArguments[5].end;
	delete deepArguments[5].range;
	deepArguments.push({ type: "JSXText", start: 0, end: 0 });
	deep.expression = negations(deep.expression, 1100);
	program.body.push(deep);
	eachNode(program, loosen);
	const { tree, program: node } = parser.syntaxTreeOfEstree(program, source);
	// Written before any object is read, as a plugin's node may be.
	const early = tree.appendEstree(
		{ type: "Identifier", name: "early", start: 0, end: 0 },
		source
	);
	tree.lazyEstree(0);
	const ids = call.arguments.map((argument) => tree.nodeOf(argument));
	// A node a plugin built while the tree is read is written into it, its
	// children ids of the tree's own nodes where it names them so.
	const built = { type: "Identifier", name: "built", start: 0, end: 0 };
	const appended = tree.appendEstree(built, source);
	const readsBack =
		tree.nodeOf(built) === appended && tree.estree(appended) === built;
	const holder = negations(
		{ type: "ArrayExpression", elements: [ids[0], null, built], start: 0, end: 0 },
		1100
	);
	const held = tree.appendEstree(
		{ type: "ExpressionStatement", expression: holder, start: 0, end: 0 },
		source
	);
	const attributes = [];
	attributes[parser.LEGACY_ASSERT_ATTRIBUTES] = true;
	const legacy = tree.appendEstree(
		{
			type: "ImportDeclaration",
			specifiers: [],
			source: { type: "Literal", value: "x", raw: '"x"', start: 0, end: 0 },
			attributes,
			start: 0,
			end: 0
		},
		source
	);
	/** @type {number[]} */
	const children = [];
	tree.pushChildren(tree.nodeOf(call), children);
	const chained = tree.appendEstree(negations(ids[0], 1100), source);
	const evaluated = parser.lazyObjectOfSource(tree.evaluationSource(ids[0]), ids[0]);
	/** @type {Record<string, unknown>} */
	const summary = {
		sameProgram: tree.estree(node) === program,
		ids: ids.map((id) => id !== 0),
		argumentTypes: ids.map((id) => tree.type(id)),
		raw: tree.estree(ids[1]) === call.arguments[1],
		appended: readsBack,
		held: tree.estree(held).expression === holder,
		chainedType: tree.type(chained),
		legacyAssert: tree.legacyAssert(legacy),
		children: children.length,
		evaluated: evaluated !== null && evaluated.type,
		early: tree.type(early),
		deepEnd: tree.end(tree.nodeOf(deep)),
		noEnd: tree.end(tree.nodeOf(deepArguments[5]))
	};
	// A reader of a tree that can parse its text again keeps no copy: once the
	// tree is released, its first read parses the text into a new tree.
	const again = `f(1);`;
	const parsedAgain = () =>
		parser.syntaxTreeOfEstree(estreeOf(again), again).tree;
	const small = parsedAgain();
	small.setRebuild(parsedAgain);
	const firstNode = small.nodeOf(small.estree(1));
	const unread = small.evaluationSource(firstNode);
	// Two releases in a row, so the second keeps its pinned readers' copy
	// whether or not a spare tree was held before.
	small.release();
	tree.release();
	summary.rebuilt = [
		parser.lazyObjectOfSource(unread, firstNode).type,
		parser.lazyObjectOfSource(unread, firstNode).type
	];
	summary.readAfterRelease = tree.estree(ids[0]).type;
	summary.unknownRoot = "written";
	try {
		parser.syntaxTreeOfEstree({ type: "JSXText", start: 0, end: 0 }, "");
	} catch (_err) {
		summary.unknownRoot = "throws";
	}
	summary.unknownDeep = "written";
	try {
		parser.fromEstreeObject(
			{ type: "Program", body: [{ type: "ExpressionStatement", expression: negations({ type: "JSXText", start: 0, end: 0 }, 1100), start: 0, end: 0 }], sourceType: "script", start: 0, end: 0 },
			""
		);
	} catch (_err) {
		summary.unknownDeep = "throws";
	}
	// ESTree objects read in place, a directive their object leaves off marked.
	const view = new parser.EstreeView();
	const statement = estreeOf(`"use strict"; f([d]);`).body[1];
	const id = view.add(statement);
	view.markDirective(statement, "use strict");
	view.markDirective(statement, "use strict");
	/** @type {number[]} */
	const viewed = [];
	view.pushChildren(id, viewed);
	view.pushChildren(viewed[0], viewed);
	summary.viewDirective = view.textOf(parser.Part.directive, id);
	summary.viewChildren = viewed.map((child) => view.type(child));
	summary.viewUnmarked = view.textOf(parser.Part.directive, viewed[0]);
	return summary;
};

/**
 * @param {string[]} log the visit log
 * @param {import("../../../helpers/fixture").SyntaxEnums} enums the parser's enums
 * @returns {Record<number, { enter: (path: EXPECTED_ANY) => void }>} a visitor at the first call that reads its place twice, tries a parse of its own and stops the walk twice
 */
const reenter = (log, enums) => ({
	[enums.NodeType.CallExpression]: {
		enter: (path) => {
			log.push(`${path.loc().join(",")} ${path.loc().join(",")}`);
			try {
				parser.fromEstreeObject(estreeOf("x;"), "x;");
				log.push("parsed while walking");
			} catch (_err) {
				log.push("no parse while walking");
			}
			path.stop();
			path.stop();
		}
	}
});

module.exports = { probe: roundTrip, roundTrip, reenter };
