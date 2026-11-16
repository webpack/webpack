/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Loaded on the first edit, once the parser has loaded and exports these.
const { Field, Flag, NodeType } = require("./syntax-parser");

/** @typedef {import("./syntax-parser").CssNodeRef} Node */
/** @typedef {import("../util/SourceProcessor").EditContext} EditContext */
/** @typedef {import("../util/SourceProcessor").EditableTree} EditableTree */
/** @typedef {Omit<EditableTree, "language" | "typeName" | "fieldName" | "isList" | "isOptional" | "locate" | "itemsOf" | "write" | "parse" | "check">} WalkSteps the walk's steps, which `EditContext` takes over once a visitor edits */
/** @typedef {"values" | "declarations" | "rules" | "stylesheet"} FragmentGoal what text an edit brings in reads as */

/**
 * What the edits read and write of the tree they are made in: its nodes'
 * spans and fields, and the records the print reads of what they changed.
 * @typedef {object} CssEditedTree
 * @property {EditContext} ctx the edits every language makes alike
 * @property {Node} sheet the stylesheet node an edit made, holding the top-level node
 * @property {boolean} inStyleAttribute whether the source is a style attribute's declarations
 * @property {string} input the source, with the text written anew after it
 * @property {number} sourceEnd where the source ends, which a node the input ran out in ends at
 * @property {Map<Node, number>} staleNodes nodes whose span no longer spells what they hold, by the fields to compose anew as `1 << field`
 * @property {number[]} moves text written anew, as new start, new end and old start triples
 * @property {Map<Node, boolean>} eofChain the nodes the input ran out in, by whether it left them open
 * @property {(n: Node) => number} type the node's `NodeType`
 * @property {(n: Node) => number} start where its span starts
 * @property {(n: Node) => number} end where its span ends
 * @property {(n: Node) => number} nameEnd where its name ends, for a type with a name
 * @property {(n: Node) => number} blockStart where a rule's block starts, `-1` without one
 * @property {(n: Node, at: number) => void} setStart moves where its span starts
 * @property {(n: Node, at: number) => void} setEnd moves where its span ends
 * @property {(n: Node, at: number) => void} setNameEnd moves where its name ends
 * @property {(n: Node, at: number) => void} setBlockStart moves where its block starts
 * @property {(n: Node, delta: number) => void} shift moves the node's own offsets, not its children's
 * @property {(n: Node, from: Node) => void} takeSpan the node reads its source where another does
 * @property {(n: Node) => void} forgetName forgets what was read off a declaration's name
 * @property {(flag: number, n: Node) => boolean} flag whether a `Flag` is set
 * @property {(flag: number, on: boolean, n: Node) => void} writeFlag sets or clears a `Flag` the node keeps
 * @property {(type: number) => boolean} holdsList whether nodes of a type hold a list of children
 * @property {(type: number) => boolean} hasName whether nodes of a type have a name
 * @property {(n: Node) => Node[]} listOf a fresh array of its list: a function's or block's value, a rule's prelude
 * @property {(n: Node) => Node[] | null} declarationsOf a rule's block declarations, null without a block
 * @property {(n: Node) => Node[] | null} rulesOf the rules nested in a rule's block, null without a block
 * @property {(n: Node) => string} unitOf a dimension's unit, escapes resolved
 * @property {(n: Node) => number[]} fieldsOf the fields it holds nodes in, in walk order
 * @property {(n: Node, field: number) => Node[]} itemsOf what the field holds: the stylesheet's own array, a fresh one otherwise
 * @property {(n: Node, list: Node[]) => void} writeList writes a node's list anew
 * @property {(n: Node, declarations: Node[], rules: Node[]) => void} writeBody writes a rule's block anew
 * @property {(text: string) => void} append adds text written anew at the end of the input
 * @property {(goal: FragmentGoal, text: string) => Node[] | null} parseFragment parses text into nodes of a goal, null where it reads as something else
 * @property {(offset: number) => number} formerOffset where the text at an offset was read from before it was written anew
 * @property {(name: string) => string} escapeIdentifier writes an identifier the shortest way that still names it
 * @property {(name: string) => string} escapeName writes a name the shortest way that still names it
 */

const CC_LEFT_PARENTHESIS = "(".charCodeAt(0);
const CC_RIGHT_PARENTHESIS = ")".charCodeAt(0);
const CC_LEFT_SQUARE = "[".charCodeAt(0);
const CC_RIGHT_SQUARE = "]".charCodeAt(0);
const CC_LEFT_CURLY = "{".charCodeAt(0);
const CC_RIGHT_CURLY = "}".charCodeAt(0);

// The types, fields and flags, by number, for an error.
const NODE_TYPE_NAMES = Object.keys(NodeType);
const FIELD_NAMES = Object.keys(Field);

// The text `writeAnew` writes and where it starts in the input: one node's at
// a time, as composing it parses nothing.
let written = "";
let writtenAt = 0;

/**
 * @param {number} type a `NodeType`
 * @returns {boolean} whether it is an at-rule or a qualified rule
 */
const isRule = (type) =>
	type === NodeType.AtRule || type === NodeType.QualifiedRule;

/**
 * @param {CssEditedTree} tree the tree
 * @param {Node} n a rule
 * @returns {Node[]} the declarations and rules its block holds, none without one
 */
const heldOf = (tree, n) => [
	.../** @type {Node[]} */ (tree.declarationsOf(n)),
	.../** @type {Node[]} */ (tree.rulesOf(n))
];

/**
 * @param {CssEditedTree} tree the tree
 * @param {Node} holder a node
 * @param {Node} child a node it holds
 * @returns {number} the field the child is in, as `1 << field`
 */
const fieldBitOf = (tree, holder, child) => {
	if (!isRule(tree.type(holder))) return 1 << Field.value;
	const own = tree.type(child);
	return (
		1 <<
		(own === NodeType.Declaration
			? Field.declarations
			: isRule(own)
				? Field.rules
				: Field.prelude)
	);
};

/**
 * Notes the nodes the input ran out in, from the top-level node down, and
 * which of them it left open.
 * @param {CssEditedTree} tree the tree
 * @param {Node} top the top-level node
 * @returns {void}
 */
const noteEofChain = (tree, top) => {
	const input = tree.input;
	let n = top;
	while (n !== 0 && tree.end(n) === tree.sourceEnd) {
		const type = tree.type(n);
		/** @type {Node} */
		let last = 0;
		if (tree.holdsList(type)) {
			const list = tree.listOf(n);
			if (list.length !== 0) last = list[list.length - 1];
			if (isRule(type) && tree.declarationsOf(n) !== null) {
				for (const item of heldOf(tree, n)) {
					if (last === 0 || tree.end(item) > tree.end(last)) last = item;
				}
			}
		}
		const start = tree.start(n);
		const closer =
			type === NodeType.Function
				? CC_RIGHT_PARENTHESIS
				: type === NodeType.SimpleBlock
					? input.charCodeAt(start) === CC_LEFT_SQUARE
						? CC_RIGHT_SQUARE
						: input.charCodeAt(start) === CC_LEFT_CURLY
							? CC_RIGHT_CURLY
							: CC_RIGHT_PARENTHESIS
					: isRule(type) && tree.blockStart(n) !== -1
						? CC_RIGHT_CURLY
						: 0;
		tree.eofChain.set(
			n,
			closer !== 0 &&
				(input.charCodeAt(tree.end(n) - 1) !== closer ||
					(last !== 0 && tree.end(last) === tree.sourceEnd))
		);
		n = last;
	}
};

/**
 * Notes that a node's span no longer spells it, nor those of what holds it.
 * @param {CssEditedTree} tree the tree
 * @param {Node} n the node
 * @param {number} bits its fields to compose anew, as `1 << field`
 * @returns {void}
 */
const markStale = (tree, n, bits) => {
	const ctx = tree.ctx;
	const staleNodes = tree.staleNodes;
	const sheet = tree.sheet;
	let node = n;
	let mask = bits;
	while (node > 0 && node !== sheet) {
		const had = staleNodes.get(node);
		if (had !== undefined) {
			staleNodes.set(node, had | mask);
			return;
		}
		staleNodes.set(node, mask);
		const holder = ctx.holderOf(node);
		mask = holder > 0 ? fieldBitOf(tree, holder, node) : 0;
		node = holder;
	}
};

/**
 * Moves a node and what it holds by an offset.
 * @param {CssEditedTree} tree the tree
 * @param {Node} n the node
 * @param {number} delta the offset
 * @returns {void}
 */
const shiftNode = (tree, n, delta) => {
	const type = tree.type(n);
	tree.shift(n, delta);
	if (tree.eofChain.size !== 0 && tree.eofChain.has(n)) {
		tree.sourceEnd = tree.end(n);
	}
	if (!tree.holdsList(type)) return;
	for (const item of tree.listOf(n)) shiftNode(tree, item, delta);
	if (!isRule(type) || tree.declarationsOf(n) === null) return;
	for (const item of heldOf(tree, n)) shiftNode(tree, item, delta);
};

/**
 * Copies the source between two offsets into the text written anew, the
 * nodes in it moving along.
 * @param {CssEditedTree} tree the tree
 * @param {number} from the first offset
 * @param {number} to the offset past the last
 * @param {Node[]} nodes the nodes in it
 * @returns {void}
 */
const copySource = (tree, from, to, nodes) => {
	const at = writtenAt + written.length;
	written += tree.input.slice(from, to);
	tree.moves.push(at, at + to - from, from);
	for (const node of nodes) shiftNode(tree, node, at - from);
};

/**
 * Writes a list field: as its source where no edit changed it, else node by node.
 * @param {CssEditedTree} tree the tree
 * @param {Node} n the node holding it
 * @param {boolean} edited whether an edit changed it
 * @param {number} from where its source starts
 * @param {number} to where it ends
 * @returns {void}
 */
const composeList = (tree, n, edited, from, to) => {
	const list = tree.listOf(n);
	if (!edited) {
		copySource(tree, from, to, list);
		return;
	}
	for (const item of list) compose(tree, item, undefined);
};

/**
 * Where each node of a block's list orders among the other list's: where it,
 * or the first after it, stood before any text was written anew.
 * @param {CssEditedTree} tree the tree
 * @param {Node[]} list the declarations or rules
 * @returns {number[]} the keys
 */
const orderKeys = (tree, list) => {
	/** @type {number[]} */
	const keys = Array.from({ length: list.length });
	let key = Infinity;
	for (let k = list.length - 1; k >= 0; k--) {
		key = Math.min(key, tree.formerOffset(tree.start(list[k])));
		keys[k] = key;
	}
	return keys;
};

/**
 * Appends a node's text to what `writeAnew` writes, its fields an edit
 * changed composed from what they hold, the others copied from the source.
 * @param {CssEditedTree} tree the tree
 * @param {Node} n the node
 * @param {string | undefined} name the name it takes, as written; undefined keeps its own
 * @returns {void}
 */
const compose = (tree, n, name) => {
	const type = tree.type(n);
	const bits = tree.staleNodes.get(n);
	const start = tree.start(n);
	const end = tree.end(n);
	if (!tree.holdsList(type) || (bits === undefined && name === undefined)) {
		copySource(tree, start, end, [n]);
		return;
	}
	tree.staleNodes.delete(n);
	const input = tree.input;
	const edits = bits === undefined ? 0 : bits;
	// One the input ran out in is written as open as it was.
	const open = tree.eofChain.get(n) === true;
	const nameEnd = tree.nameEnd(n);
	const at = writtenAt + written.length;
	tree.moves.push(at, at, start);
	tree.setStart(n, at);
	if (type === NodeType.Declaration) {
		tree.forgetName(n);
		written += name === undefined ? input.slice(start, nameEnd) : name;
		tree.setNameEnd(n, writtenAt + written.length);
		if ((edits & (1 << Field.value)) === 0) {
			composeList(tree, n, false, nameEnd, end);
		} else {
			written += ":";
			composeList(tree, n, true, 0, 0);
			if (tree.flag(Flag.important, n)) written += "!important";
		}
	} else if (type === NodeType.Function || type === NodeType.SimpleBlock) {
		const from = type === NodeType.Function ? nameEnd + 1 : start + 1;
		const opener = input.charCodeAt(from - 1);
		const closer =
			opener === CC_LEFT_PARENTHESIS
				? CC_RIGHT_PARENTHESIS
				: opener === CC_LEFT_SQUARE
					? CC_RIGHT_SQUARE
					: CC_RIGHT_CURLY;
		if (type === NodeType.Function) {
			written += name === undefined ? input.slice(start, nameEnd) : name;
			tree.setNameEnd(n, writtenAt + written.length);
		}
		written += String.fromCharCode(opener);
		composeList(
			tree,
			n,
			(edits & (1 << Field.value)) !== 0,
			from,
			open ? end : end - 1
		);
		if (!open) written += String.fromCharCode(closer);
	} else {
		const blockStart = tree.blockStart(n);
		let from = start;
		if (type === NodeType.AtRule) {
			written += name === undefined ? input.slice(start, nameEnd) : `@${name}`;
			tree.setNameEnd(n, writtenAt + written.length);
			from = nameEnd;
		}
		if ((edits & (1 << Field.prelude)) === 0) {
			composeList(tree, n, false, from, blockStart === -1 ? end : blockStart);
		} else {
			const list = tree.listOf(n);
			// An at-rule's name ends where its prelude's first token starts.
			if (
				type === NodeType.AtRule &&
				list.length !== 0 &&
				tree.type(list[0]) !== NodeType.Whitespace
			) {
				written += " ";
			}
			for (const item of list) compose(tree, item, undefined);
		}
		if (blockStart !== -1) {
			tree.setBlockStart(n, writtenAt + written.length);
			written += "{";
			composeBody(tree, n, edits, blockStart + 1, open ? end : end - 1);
			if (!open) written += "}";
		}
	}
	const newEnd = writtenAt + written.length;
	tree.setEnd(n, newEnd);
	tree.moves.push(newEnd, newEnd, end);
	if (tree.eofChain.has(n)) tree.sourceEnd = newEnd;
};

/**
 * Writes a rule's block between its braces: as its source where no edit
 * changed its declarations or rules, else item by item in source order.
 * @param {CssEditedTree} tree the tree
 * @param {Node} n the rule
 * @param {number} edits its fields an edit changed, as `1 << field`
 * @param {number} from where its block's content starts
 * @param {number} to where it ends
 * @returns {void}
 */
const composeBody = (tree, n, edits, from, to) => {
	const decls = tree.declarationsOf(n) || [];
	const rules = tree.rulesOf(n) || [];
	if ((edits & ((1 << Field.declarations) | (1 << Field.rules))) === 0) {
		copySource(tree, from, to, [...decls, ...rules]);
		return;
	}
	const declKeys = orderKeys(tree, decls);
	const ruleKeys = orderKeys(tree, rules);
	let d = 0;
	let r = 0;
	while (d < decls.length || r < rules.length) {
		if (
			r === rules.length ||
			(d < decls.length && declKeys[d] <= ruleKeys[r])
		) {
			compose(tree, decls[d++], undefined);
			written += ";";
		} else {
			const rule = rules[r++];
			compose(tree, rule, undefined);
			if (tree.blockStart(rule) === -1) written += ";";
		}
	}
};

/**
 * Writes a node's text anew at the end of the input, from what it holds, and
 * has it and every node in it read their source there.
 * @param {CssEditedTree} tree the tree
 * @param {Node} n the node
 * @param {string | undefined} name the name it takes, as written; undefined keeps its own
 * @returns {void}
 */
const writeAnew = (tree, n, name) => {
	written = "";
	writtenAt = tree.input.length;
	compose(tree, n, name);
	// Nothing written anew ends the input, which reads as a source cut short.
	const text = `${written}\n`;
	written = "";
	tree.append(text);
};

/**
 * Writes a token's source anew at the end of the input, and reads it back.
 * @param {CssEditedTree} tree the tree
 * @param {Node} n the token
 * @param {string} text its new source
 * @returns {boolean} whether it reads as one token of its type
 */
const rewriteToken = (tree, n, text) => {
	const read = tree.parseFragment("values", text);
	if (
		read === null ||
		read.length !== 1 ||
		tree.type(read[0]) !== tree.type(n)
	) {
		return false;
	}
	tree.moves.push(tree.start(read[0]), tree.start(read[0]), tree.start(n));
	tree.takeSpan(n, read[0]);
	const holder = tree.ctx.holderOf(n);
	markStale(tree, holder, fieldBitOf(tree, holder, n));
	return true;
};

/**
 * The tree and walk as `EditContext` reads them: a rule holds its prelude,
 * declarations and nested rules, and the top-level node the walk is in
 * stands in the rules of a stylesheet node an edit makes.
 * @param {CssEditedTree} tree the tree the edits are made in
 * @param {WalkSteps} steps the walk's steps
 * @returns {EditableTree} the tree
 */
const editableTreeOf = (tree, steps) => ({
	...steps,
	language: "css",
	typeName: (node) => NODE_TYPE_NAMES[tree.type(node) - 1] || "Node",
	fieldName: (field) => FIELD_NAMES[field - 1] || String(field),
	isList: (container, field) => {
		if (tree.fieldsOf(container).includes(field)) return true;
		const ctx = tree.ctx;
		throw ctx.error(
			isRule(tree.type(container)) &&
				(field === Field.declarations || field === Field.rules)
				? `${ctx.describe(container)} with no block holds no ${FIELD_NAMES[field - 1]}`
				: `${ctx.describe(container)} has no field ${FIELD_NAMES[field - 1] || field}`
		);
	},
	isOptional: () => true,
	locate: (container, node) => {
		for (const field of tree.fieldsOf(container)) {
			const index = tree.itemsOf(container, field).indexOf(node);
			if (index !== -1) return { field, index };
		}
		return undefined;
	},
	itemsOf: (container, field) => [...tree.itemsOf(container, field)],
	write: (container, field, index, removeCount, items) => {
		if (container === tree.sheet) {
			tree.itemsOf(container, field).splice(index, removeCount, ...items);
		} else if (field === Field.declarations || field === Field.rules) {
			const declarations = tree.itemsOf(container, Field.declarations);
			const rules = tree.itemsOf(container, Field.rules);
			(field === Field.declarations ? declarations : rules).splice(
				index,
				removeCount,
				...items
			);
			tree.writeBody(container, declarations, rules);
		} else {
			const list = tree.listOf(container);
			list.splice(index, removeCount, ...items);
			tree.writeList(container, list);
		}
		markStale(tree, container, 1 << field);
	},
	parse: (container, field, text) => {
		const ctx = tree.ctx;
		const goal =
			field === Field.value || field === Field.prelude
				? "values"
				: container === tree.sheet
					? tree.inStyleAttribute
						? "declarations"
						: "stylesheet"
					: field === Field.declarations
						? "declarations"
						: "rules";
		const nodes = tree.parseFragment(goal, text);
		if (nodes === null || (nodes.length === 0 && text.trim() !== "")) {
			throw ctx.error(
				`${JSON.stringify(text)} does not read as ${ctx.describe(container)}'s ${FIELD_NAMES[field - 1]}`
			);
		}
		return nodes;
	},
	check: (container, field, added) => {
		const ctx = tree.ctx;
		const declarations =
			field === Field.declarations ||
			(container === tree.sheet && tree.inStyleAttribute);
		for (const item of added) {
			const type = item === 0 ? 0 : tree.type(item);
			const rule = isRule(type);
			if (
				item === 0 ||
				type === NodeType.Stylesheet ||
				(field === Field.value || field === Field.prelude
					? rule || type === NodeType.Declaration
					: declarations
						? type !== NodeType.Declaration
						: !rule)
			) {
				throw ctx.error(
					`${container === tree.sheet ? "a Stylesheet" : ctx.describe(container)}'s ${FIELD_NAMES[field - 1]} hold no ${item === 0 ? "hole" : ctx.tree.typeName(item)}`
				);
			}
		}
	}
});

/**
 * Writes a node's text anew where an edit left its span not spelling it, so
 * every reader of the source reads what it holds.
 * @param {CssEditedTree} tree the tree
 * @param {Node} n the node
 * @returns {void}
 */
const settle = (tree, n) => {
	if (tree.staleNodes.has(n)) writeAnew(tree, n, undefined);
};

/**
 * @param {CssEditedTree} tree the tree
 * @param {Node} n a declaration, at-rule, function or dimension
 * @param {string} name its name, decoded
 * @returns {void}
 */
const setName = (tree, n, name) => {
	const ctx = tree.ctx;
	ctx.checkNode(n);
	ctx.checkWritable(n);
	if (typeof name !== "string" || name === "") {
		throw ctx.error(`${JSON.stringify(name)} is no name`);
	}
	const type = tree.type(n);
	if (type === NodeType.Dimension) {
		const number = tree.input.slice(
			tree.start(n),
			tree.end(n) - tree.unitOf(n).length
		);
		if (!rewriteToken(tree, n, `${number}${tree.escapeIdentifier(name)}`)) {
			throw ctx.error(`${JSON.stringify(name)} is no unit`);
		}
		return;
	}
	if (!tree.hasName(type)) {
		throw ctx.error(`${ctx.describe(n)} has no name`);
	}
	writeAnew(tree, n, tree.escapeName(name));
	const holder = ctx.holderOf(n);
	if (holder !== tree.sheet) {
		markStale(tree, holder, fieldBitOf(tree, holder, n));
	}
};

/**
 * @param {CssEditedTree} tree the tree
 * @param {Node} n a token
 * @param {string | number} value its value, as `value` reads it
 * @returns {void}
 */
const setValue = (tree, n, value) => {
	const ctx = tree.ctx;
	ctx.checkNode(n);
	ctx.checkWritable(n);
	const type = tree.type(n);
	const text = String(value);
	/** @type {string | null} */
	let source = null;
	switch (type) {
		case NodeType.Ident:
			if (typeof value === "string") source = tree.escapeIdentifier(value);
			break;
		case NodeType.String:
			if (typeof value === "string") {
				source = `"${value.replace(/["\\\n]/g, (c) => (c === "\n" ? "\\a " : `\\${c}`))}"`;
			}
			break;
		case NodeType.Hash:
			if (typeof value === "string") source = `#${tree.escapeName(value)}`;
			break;
		case NodeType.Url:
			if (typeof value === "string") {
				source = `url("${value.replace(/["\\\n]/g, (c) => (c === "\n" ? "\\a " : `\\${c}`))}")`;
			}
			break;
		case NodeType.Number:
			if (typeof value === "number") source = text;
			break;
		case NodeType.Percentage:
			if (typeof value === "number") source = `${text}%`;
			break;
		case NodeType.Dimension:
			if (typeof value === "number") {
				source = `${text}${tree.escapeIdentifier(tree.unitOf(n))}`;
			}
			break;
		case NodeType.Delim:
			source = text;
			break;
		default:
			throw ctx.error(`${ctx.describe(n)} has no value an edit sets`);
	}
	if (source === null || !rewriteToken(tree, n, source)) {
		throw ctx.error(`${ctx.describe(n)} holds no ${JSON.stringify(value)}`);
	}
};

/**
 * @param {CssEditedTree} tree the tree
 * @param {number} flag a `Flag`
 * @param {boolean} on whether it is set
 * @param {Node} n the node
 * @returns {void}
 */
const setFlag = (tree, flag, on, n) => {
	const ctx = tree.ctx;
	ctx.checkNode(n);
	ctx.checkWritable(n);
	if (flag === Flag.important && tree.type(n) === NodeType.Declaration) {
		tree.writeFlag(flag, on, n);
		markStale(tree, n, 1 << Field.value);
		return;
	}
	if (flag === Flag.integer || flag === Flag.id) {
		if (tree.flag(flag, n) === on) return;
		throw ctx.error(
			`${ctx.describe(n)}'s type flag follows from its text; set its value instead`
		);
	}
	throw ctx.error(`${ctx.describe(n)} has no flag ${flag}`);
};

module.exports = {
	editableTreeOf,
	noteEofChain,
	setFlag,
	setName,
	setValue,
	settle
};
