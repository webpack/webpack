/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { Field, Flag, NodeType, Part } = require("./data");
const { FIELD_GOALS, FIELD_TYPE_SETS } = require("./field-goals");

/** @typedef {import("./syntax-parser").SyntaxTree} SyntaxTree */
/** @typedef {import("./syntax-parser").TreeValue} TreeValue */
/** @typedef {import("./syntax-parser").JavascriptSourceType} JavascriptSourceType */

/**
 * What an edit reads and changes of the walk it is made in. The walk reads
 * the marks the editor keeps there, so it knows where an edit leaves it.
 * @typedef {object} EditedWalk
 * @property {SyntaxTree} tree the tree walked
 * @property {number} program its program
 * @property {number} node the node the walk is at
 * @property {boolean} exiting whether the visitors firing are `exit` ones
 * @property {boolean} printing whether the walk prints
 * @property {JavascriptSourceType} sourceType what the walked source is read as
 * @property {number[]} parents the nodes the walk is inside, outermost first
 * @property {Uint8Array} marks by node, where the walk is with it, as `MARK_*` numbers it
 * @property {Int32Array} parentOf by node, the node holding it, `0` for the program and one out of the tree
 * @property {(marks: Uint8Array, parentOf: Int32Array) => void} setColumns hands the walk the columns the editor keeps
 * @property {() => ({ fieldSlots: Int8Array, fields: { name: string, kind: number, slot: number }[], nameSlot: number, valueSlot: number, partSlots: Int8Array } | undefined)[]} types every node type's descriptor, by `NodeType`
 * @property {(tree: SyntaxTree, node: number) => number[]} childrenOf a node's children in source order
 * @property {(container: number, items: number[]) => void} walkAdded walks nodes added to a node the walk is done with
 * @property {(text: string, sourceType: JavascriptSourceType) => number} parse parses text into the tree, returning its program
 */

/**
 * What a field takes: the goal its text parses as, whether it may be empty,
 * and the node types it holds.
 * @typedef {object} FieldGoal
 * @property {string} goal the goal, as `FIELD_GOALS` names it
 * @property {boolean} nullable whether it may hold no node, or a list a hole
 * @property {Set<number> | null} accepts the `NodeType`s it holds, null where it takes none
 */

/**
 * @param {Record<string, number>} table a numbered table
 * @returns {string[]} its member names, by number
 */
const namesOf = (table) => {
	/** @type {string[]} */
	const names = [];
	for (const name of Object.keys(table)) names[table[name]] = name;
	return names;
};

const TYPE_NAMES = namesOf(NodeType);
const FIELD_NAMES = namesOf(Field);
const PART_NAMES = namesOf(Part);
/** @type {Map<number, string>} */
const FLAG_NAMES = new Map(
	Object.keys(Flag).map((name) => [
		/** @type {Record<string, number>} */ (Flag)[name],
		name
	])
);

// Where the walk is with each node, as `syntax-parser.js` numbers it: not
// reached, inside it, inside it and owing it added children, done with it, or
// out of the tree.
const MARK_NONE = 0;
const MARK_ENTERED = 1;
const MARK_GREW = 2;
const MARK_DONE = 3;
const MARK_REMOVED = 4;

/**
 * Reads where the walk is with every node, for its first edit: the nodes it
 * left behind are done, the ones it is inside entered, and each node's parent
 * read off the tree.
 * @param {EditedWalk} walk the walk
 * @returns {void}
 */
const startEdits = (walk) => {
	const tree = walk.tree;
	const marks = new Uint8Array(tree.size + 1);
	const parents = new Int32Array(tree.size + 1);
	const current = walk.node;
	const exiting = walk.exiting;
	let reached = false;
	/**
	 * @param {number} node a node, the walk's order reaching it
	 * @param {boolean} done whether the walk is done with it
	 * @returns {void}
	 */
	const read = (node, done) => {
		const children = walk.childrenOf(tree, node);
		for (let i = 0; i < children.length; i++) parents[children[i]] = node;
		if (done || reached) {
			if (done) marks[node] = MARK_DONE;
			for (let i = 0; i < children.length; i++) read(children[i], done);
			return;
		}
		marks[node] = MARK_ENTERED;
		if (node === current) {
			reached = true;
			// An `exit` visitor's node has its children walked already.
			for (let i = 0; i < children.length; i++) read(children[i], exiting);
			return;
		}
		for (let i = 0; i < children.length; i++) read(children[i], false);
		if (!reached) marks[node] = MARK_DONE;
	};
	read(walk.program, false);
	walk.setColumns(marks, parents);
};

/**
 * @param {EditedWalk} walk the walk
 * @param {number} node a node
 * @returns {number} the node holding it, `0` for the program and one out of the tree
 */
const parentOf = (walk, node) => walk.parentOf[node];

/**
 * @param {EditedWalk} walk the walk
 * @param {number} node a node
 * @returns {boolean} whether the walk printed it already
 */
const isPrinted = (walk, node) =>
	walk.printing && walk.marks[node] === MARK_DONE;

/**
 * @param {EditedWalk} walk the walk
 * @param {number} node a node
 * @returns {boolean} whether the walk is inside it
 */
const isWalking = (walk, node) =>
	walk.marks[node] === MARK_ENTERED || walk.marks[node] === MARK_GREW;

/**
 * Reads the nodes a parse added: the columns grow to hold them, and each
 * one's children are its.
 * @param {EditedWalk} walk the walk
 * @param {number} first the first node
 * @param {number} last the last node
 * @returns {void}
 */
const added = (walk, first, last) => {
	const tree = walk.tree;
	if (tree.size >= walk.marks.length) {
		const size = Math.max(tree.size + 1, walk.marks.length * 2);
		const marks = new Uint8Array(size);
		marks.set(walk.marks);
		const parents = new Int32Array(size);
		parents.set(walk.parentOf);
		walk.setColumns(marks, parents);
	}
	const parents = walk.parentOf;
	for (let node = first; node <= last; node++) {
		const children = walk.childrenOf(tree, node);
		for (let i = 0; i < children.length; i++) parents[children[i]] = node;
	}
};

/**
 * Sets a node and everything under it as not reached, to be walked where an
 * edit moved it.
 * @param {EditedWalk} walk the walk
 * @param {number} node the node
 * @returns {void}
 */
const resetMarks = (walk, node) => {
	if (walk.marks[node] === MARK_NONE) return;
	walk.marks[node] = MARK_NONE;
	const children = walk.childrenOf(walk.tree, node);
	for (let i = 0; i < children.length; i++) resetMarks(walk, children[i]);
};

/**
 * The nodes now stand in the container: the walk reads its children again
 * where it is inside it, or walks them where it is done with it and prints
 * nothing.
 * @param {EditedWalk} walk the walk
 * @param {number} container the node
 * @param {number[]} items the nodes, `0` for a hole
 * @returns {void}
 */
const attached = (walk, container, items) => {
	for (let i = 0; i < items.length; i++) {
		if (items[i] === 0) continue;
		walk.parentOf[items[i]] = container;
		resetMarks(walk, items[i]);
	}
	const mark = walk.marks[container];
	if (mark === MARK_ENTERED) {
		walk.marks[container] = MARK_GREW;
	} else if (mark === MARK_DONE && !walk.printing) {
		walk.walkAdded(container, items);
	}
};

/**
 * The node left the container, to stand elsewhere where `moving`.
 * @param {EditedWalk} walk the walk
 * @param {number} node the node
 * @param {number} container the node that held it
 * @param {boolean} moving whether it moves rather than leaves the tree
 * @returns {void}
 */
const detached = (walk, node, container, moving) => {
	const marks = walk.marks;
	walk.parentOf[node] = 0;
	// Taken out while the walk is inside it, the nodes it holds go with it.
	if (marks[node] === MARK_ENTERED || marks[node] === MARK_GREW) {
		const at = walk.parents.indexOf(node);
		if (at !== -1) {
			for (let i = at + 1; i < walk.parents.length; i++) {
				marks[walk.parents[i]] = MARK_REMOVED;
			}
			marks[walk.node] = MARK_REMOVED;
		}
	}
	marks[node] = MARK_REMOVED;
	// Moved, it is walked anew: the walk inside the container must not find it there.
	if (moving && marks[container] === MARK_ENTERED) {
		marks[container] = MARK_GREW;
	}
};

/** @type {(FieldGoal | undefined)[][] | undefined} */
let fieldGoals;

/**
 * @returns {(FieldGoal | undefined)[][]} by `NodeType` and `Field`, what the field takes
 */
const getFieldGoals = () => {
	if (fieldGoals !== undefined) return fieldGoals;
	const sets = FIELD_TYPE_SETS.map(
		(names) =>
			new Set(
				names
					.split(" ")
					.map((name) => /** @type {Record<string, number>} */ (NodeType)[name])
			)
	);
	/** @type {(FieldGoal | undefined)[][]} */
	const byType = [];
	for (const typeName of Object.keys(FIELD_GOALS)) {
		/** @type {(FieldGoal | undefined)[]} */
		const byField = [];
		const spec = FIELD_GOALS[typeName];
		for (const part of spec === "" ? [] : spec.split(" ")) {
			const [fieldName, goal, set] = part.split(":");
			const nullable = goal.endsWith("?");
			byField[/** @type {Record<string, number>} */ (Field)[fieldName]] = {
				goal: nullable ? goal.slice(0, -1) : goal,
				nullable,
				accepts: set === "-1" ? null : sets[Number(set)]
			};
		}
		byType[/** @type {Record<string, number>} */ (NodeType)[typeName]] =
			byField;
	}
	return (fieldGoals = byType);
};

/**
 * @param {SyntaxTree} tree the tree
 * @param {number} node a node
 * @returns {string} its ESTree type, for an error
 */
const typeName = (tree, node) => TYPE_NAMES[tree.type(node)];

/**
 * @param {string} name a node type's name
 * @returns {string} it after its indefinite article, for an error
 */
const article = (name) => `${/^(?:A|E|I|O|U)/.test(name) ? "an" : "a"} ${name}`;

/**
 * @param {EditedWalk} walk the walk
 * @param {number} type a `NodeType`
 * @returns {NonNullable<ReturnType<EditedWalk["types"]>[number]>} its descriptor
 */
const descriptorOf = (walk, type) =>
	/** @type {NonNullable<ReturnType<EditedWalk["types"]>[number]>} */ (
		walk.types()[type]
	);

/**
 * @param {EditedWalk} walk the walk
 * @param {number} node a node
 * @param {number} field a `Field`
 * @returns {boolean} whether the field holds a list
 */
const isList = (walk, node, field) =>
	(descriptorOf(walk, walk.tree.type(node)).fieldSlots[field] & 1) === 1;

/**
 * @param {EditedWalk} walk the walk
 * @param {number} node a node
 * @param {number} field a `Field`
 * @returns {FieldGoal} what the field takes, throwing where the node's type has no such field
 */
const goalOf = (walk, node, field) => {
	const goal = getFieldGoals()[walk.tree.type(node)][field];
	if (goal === undefined) {
		throw new Error(
			`javascript syntax: ${article(typeName(walk.tree, node))} has no field ${FIELD_NAMES[field] || field}`
		);
	}
	return goal;
};

/**
 * @param {EditedWalk} walk the walk
 * @param {number} node what an edit was given as a node
 * @returns {void}
 */
const checkNode = (walk, node) => {
	if (!Number.isInteger(node) || node < 1 || node > walk.tree.size) {
		throw new Error(`javascript syntax: ${node} is no node`);
	}
};

/**
 * @param {EditedWalk} walk the walk
 * @param {number} node a node
 * @returns {void}
 */
const checkWritable = (walk, node) => {
	if (isPrinted(walk, node)) {
		throw new Error(
			`javascript syntax: ${article(typeName(walk.tree, node))} the walk printed already can no longer be edited; edit it before its exit visitors return`
		);
	}
};

/**
 * @param {EditedWalk} walk the walk
 * @param {number} node a node in the tree
 * @returns {{ container: number, field: number, index: number }} the node holding it, the field it is in, and its index there, `-1` in a single-node field
 */
const locate = (walk, node) => {
	const tree = walk.tree;
	if (node === walk.program) {
		throw new Error("javascript syntax: the program is in no field");
	}
	const container = parentOf(walk, node);
	if (container === 0) {
		throw new Error(
			`javascript syntax: the ${typeName(tree, node)} is not in the tree`
		);
	}
	const fields = descriptorOf(walk, tree.type(container)).fieldSlots;
	for (let field = 1; field < fields.length; field++) {
		if (fields[field] === -1) continue;
		const count = tree.fieldCount(field, container);
		for (let i = 0; i < count; i++) {
			if (tree.field(i, field, container) === node) {
				return { container, field, index: (fields[field] & 1) === 1 ? i : -1 };
			}
		}
	}
	throw new Error(
		`javascript syntax: the ${typeName(tree, node)} is not in the tree`
	);
};

/**
 * @param {SyntaxTree} tree the tree
 * @param {number} node a node
 * @param {number} field a `Field`
 * @returns {number[]} the field's items, `0` for a hole
 */
const itemsOf = (tree, node, field) => {
	/** @type {number[]} */
	const items = [];
	const count = tree.fieldCount(field, node);
	for (let i = 0; i < count; i++) items.push(tree.field(i, field, node));
	return items;
};

/**
 * @param {SyntaxTree} tree the tree
 * @param {number} node a node
 * @param {number} field a `Field` holding one node
 * @returns {number} the node it holds, `0` for none
 */
const one = (tree, node, field) => tree.field(0, field, node);

/**
 * @param {EditedWalk} walk the walk
 * @param {number} node a node
 * @param {string} flagName a flag's ESTree name
 * @returns {boolean} whether the node's type has the flag
 */
const hasFlag = (walk, node, flagName) =>
	descriptorOf(walk, walk.tree.type(node)).fields.some(
		(field) => field.name === flagName && field.kind === FLAG_KIND
	);

// A descriptor field's kind for a flag, as the parser numbers field kinds.
const FLAG_KIND = 3;

/**
 * The function whose body holds a node, read off its flags, so a fragment
 * parses where `await`, `yield` and `super` read as they do there.
 * @param {EditedWalk} walk the walk
 * @param {number} node a node
 * @returns {number} the nearest function holding it or being it, `0` at the top level
 */
const enclosingFunction = (walk, node) => {
	for (let n = node; n !== 0; n = parentOf(walk, n)) {
		if (hasFlag(walk, n, "generator")) return n;
	}
	return 0;
};

/**
 * Whether the program's code is strict where it is not a module: its
 * directive prologue says `"use strict"`.
 * @param {EditedWalk} walk the walk
 * @returns {boolean} whether it is
 */
const isStrictScript = (walk) => {
	const tree = walk.tree;
	const count = tree.fieldCount(Field.body, walk.program);
	for (let i = 0; i < count; i++) {
		const directive = tree.textOf(
			Part.directive,
			tree.field(i, Field.body, walk.program)
		);
		if (directive === null) return false;
		if (directive === "use strict") return true;
	}
	return false;
};

/**
 * @param {SyntaxTree} tree the tree
 * @param {number} node a node
 * @returns {boolean} whether it is an IterationStatement, ECMA-262 §14.7, which `continue` reads
 */
const isLoop = (tree, node) => {
	const type = tree.type(node);
	return (
		type === NodeType.ForStatement ||
		type === NodeType.ForInStatement ||
		type === NodeType.ForOfStatement ||
		type === NodeType.WhileStatement ||
		type === NodeType.DoWhileStatement
	);
};

/**
 * What `break` and `continue` can reach from `node` inside its function:
 * the loops, switches and labels holding it, outermost first, each as what
 * stands in for it around a fragment and how to read the fragment out.
 * @param {EditedWalk} walk the walk
 * @param {number} node a node
 * @param {number} fn the function holding it, `0` for none
 * @returns {{ open: string, close: string, read: (statements: number[]) => number[] }[]} the levels
 */
const jumpTargets = (walk, node, fn) => {
	const tree = walk.tree;
	/** @type {{ open: string, close: string, read: (statements: number[]) => number[] }[]} */
	const levels = [];
	for (let n = node; n !== 0 && n !== fn; n = parentOf(walk, n)) {
		if (isLoop(tree, n)) {
			levels.push({
				open: "for(;;){",
				close: "}",
				read: (statements) =>
					itemsOf(tree, one(tree, statements[0], Field.body), Field.body)
			});
		} else if (tree.type(n) === NodeType.SwitchStatement) {
			levels.push({
				open: "switch(0){default:",
				close: "}",
				read: (statements) =>
					itemsOf(
						tree,
						tree.field(0, Field.cases, statements[0]),
						Field.consequent
					)
			});
		} else if (tree.type(n) === NodeType.LabeledStatement) {
			const name = tree.name(one(tree, n, Field.label));
			let body = one(tree, n, Field.body);
			while (tree.type(body) === NodeType.LabeledStatement) {
				body = one(tree, body, Field.body);
			}
			// A loop's label goes on the loop standing in for it, so `continue` reaches it.
			levels.push(
				isLoop(tree, body)
					? {
							open: `${name}:`,
							close: "",
							read: (statements) => [one(tree, statements[0], Field.body)]
						}
					: {
							open: `${name}:{`,
							close: "}",
							read: (statements) =>
								itemsOf(tree, one(tree, statements[0], Field.body), Field.body)
						}
			);
		}
	}
	return levels.reverse();
};

/**
 * Parses text into the tree inside what reads it as the code around `node`
 * reads: the nearest function's kind, the loops and labels a jump reaches,
 * or the program's goal.
 * @param {EditedWalk} walk the walk
 * @param {number} node the node the text will stand under
 * @param {string} text the source, a statement list
 * @param {boolean} moduleOnly whether only a module's top level reads it
 * @returns {number[]} the statements it parsed to
 */
const parseInContext = (walk, node, text, moduleOnly) => {
	const fn = moduleOnly ? 0 : enclosingFunction(walk, node);
	const levels = moduleOnly ? [] : jumpTargets(walk, node, fn);
	let inner = text;
	for (let i = levels.length - 1; i >= 0; i--) {
		inner = `${levels[i].open}${inner}${levels[i].close}`;
	}
	let statements = parseInFunction(walk, fn, inner, moduleOnly);
	for (const level of levels) statements = level.read(statements);
	return statements;
};

/**
 * Parses statements into the tree inside a function of `fn`'s kind, or at
 * the top level where `fn` is `0`.
 * @param {EditedWalk} walk the walk
 * @param {number} fn the function, `0` for none
 * @param {string} inner the source, a statement list
 * @param {boolean} moduleOnly whether only a module's top level reads it
 * @returns {number[]} the statements it parsed to
 */
const parseInFunction = (walk, fn, inner, moduleOnly) => {
	const tree = walk.tree;
	let sourceType = moduleOnly ? "module" : walk.sourceType;
	if (fn === 0) {
		const strict =
			sourceType !== "module" && isStrictScript(walk) ? '"use strict";' : "";
		return itemsOf(tree, walk.parse(strict + inner, sourceType), Field.body);
	}
	const isAsync = tree.flag(Flag.async, fn);
	const isGenerator = tree.flag(Flag.generator, fn);
	const flags = `${isAsync ? "async " : ""}${isGenerator ? "*" : ""}`;
	const holder = parentOf(walk, fn);
	const holderType = holder === 0 ? 0 : tree.type(holder);
	const kind = holder === 0 ? null : tree.textOf(Part.kind, holder);
	if (sourceType === "commonjs" || sourceType === "event-handler") {
		sourceType = "script";
	}
	/**
	 * @param {number} fnNode a function the probe parsed
	 * @returns {number[]} its body's statements
	 */
	const bodyOf = (fnNode) =>
		itemsOf(tree, one(tree, fnNode, Field.body), Field.body);
	if (holderType === NodeType.MethodDefinition) {
		// A class method reads `super`, and a derived constructor `super()`.
		const name = kind === "constructor" ? "constructor" : `${flags}f`;
		const program = walk.parse(
			`(class extends Object{${name}(){${inner}}});`,
			sourceType
		);
		const body = one(tree, firstExpression(tree, program), Field.body);
		return bodyOf(one(tree, tree.field(0, Field.body, body), Field.value));
	}
	if (
		holderType === NodeType.Property &&
		(kind !== "init" || tree.flag(Flag.method, holder))
	) {
		const program = walk.parse(`({${flags}f(){${inner}}});`, sourceType);
		const object = firstExpression(tree, program);
		return bodyOf(
			one(tree, tree.field(0, Field.properties, object), Field.value)
		);
	}
	const program = walk.parse(
		`${isAsync ? "async " : ""}function${isGenerator ? "*" : ""} f(){${inner}}`,
		sourceType
	);
	return bodyOf(tree.field(0, Field.body, program));
};

/**
 * @param {SyntaxTree} tree the tree
 * @param {number} program a probe's program
 * @returns {number} its first statement's expression
 */
const firstExpression = (tree, program) =>
	one(tree, tree.field(0, Field.body, program), Field.expression);

/**
 * Whether a pattern under `node` binds names, as a declaration's or a
 * parameter's does, rather than assigning to targets.
 * @param {EditedWalk} walk the walk
 * @param {number} node the node a pattern stands under
 * @returns {boolean} whether it binds
 */
const isBinding = (walk, node) => {
	const tree = walk.tree;
	for (let n = node; n !== 0; n = parentOf(walk, n)) {
		const type = tree.type(n);
		if (
			type === NodeType.AssignmentExpression ||
			type === NodeType.ForInStatement ||
			type === NodeType.ForOfStatement
		) {
			return false;
		}
		if (
			type !== NodeType.ArrayPattern &&
			type !== NodeType.ObjectPattern &&
			type !== NodeType.AssignmentPattern &&
			type !== NodeType.RestElement &&
			type !== NodeType.Property
		) {
			return true;
		}
	}
	return true;
};

/**
 * Parses text for a field: the field's goal names the source it is read in
 * and where the nodes it means stand there.
 * @param {EditedWalk} walk the walk
 * @param {number} container the node the text goes under
 * @param {number} field its `Field`
 * @param {FieldGoal} goal what the field takes
 * @param {string} text the text
 * @returns {number[]} the nodes it parsed to, `0` for a hole
 */
const parseForField = (walk, container, field, goal, text) => {
	const tree = walk.tree;
	/**
	 * @param {string} inner the source the text stands in
	 * @param {boolean=} moduleOnly whether only a module's top level reads it
	 * @returns {number[]} its statements
	 */
	const read = (inner, moduleOnly = false) =>
		parseInContext(walk, container, inner, moduleOnly);
	/**
	 * @param {number[]} statements a fragment's statements
	 * @returns {number} the first one's expression
	 */
	const expressionOf = (statements) =>
		one(tree, statements[0], Field.expression);
	switch (goal.goal) {
		case "statement":
		case "declaration":
		case "block":
			return read(text);
		case "exportDefault":
			return [
				one(tree, read(`export default ${text}`, true)[0], Field.declaration)
			];
		case "expression":
		case "argument":
		case "identifier":
		case "moduleName":
		case "string":
		case "template":
			return itemsOf(tree, expressionOf(read(`[${text}];`)), Field.elements);
		case "arrowBody":
			return [one(tree, expressionOf(read(`(()=>${text});`)), Field.body)];
		case "pattern":
			if (field === Field.params) {
				return itemsOf(
					tree,
					expressionOf(read(`(function(${text}){});`)),
					Field.params
				);
			}
			if (isBinding(walk, container)) {
				const params = itemsOf(
					tree,
					expressionOf(read(`(function([${text}]){});`)),
					Field.params
				);
				return itemsOf(tree, params[0], Field.elements);
			}
			return itemsOf(
				tree,
				one(tree, expressionOf(read(`[${text}]=0;`)), Field.left),
				Field.elements
			);
		case "patternProperty":
			if (isBinding(walk, container)) {
				const params = itemsOf(
					tree,
					expressionOf(read(`(function({${text}}){});`)),
					Field.params
				);
				return itemsOf(tree, params[0], Field.properties);
			}
			return itemsOf(
				tree,
				one(tree, expressionOf(read(`({${text}}=0);`)), Field.left),
				Field.properties
			);
		case "property":
			return itemsOf(
				tree,
				expressionOf(read(`({${text}});`)),
				Field.properties
			);
		case "classMember":
			return itemsOf(
				tree,
				one(tree, expressionOf(read(`(class{${text}});`)), Field.body),
				Field.body
			);
		case "switchCase":
			return itemsOf(tree, read(`switch(0){${text}}`)[0], Field.cases);
		case "declarator":
			return itemsOf(tree, read(`var ${text};`)[0], Field.declarations);
		case "forInit":
			return [one(tree, read(`for(${text};;);`)[0], Field.init)];
		case "forLeft":
			return [one(tree, read(`for(${text} of 0);`)[0], Field.left)];
		case "catchClause":
			return [one(tree, read(`try{}${text}`)[0], Field.handler)];
		case "importSpecifier": {
			// Beside named imports a name reads as one, else as the default.
			const named = itemsOf(tree, container, Field.specifiers).some(
				(item) => tree.type(item) === NodeType.ImportSpecifier
			);
			const forms = named
				? [`import{${text}}from"";`, `import ${text} from"";`]
				: [`import ${text} from"";`, `import{${text}}from"";`];
			let statements;
			try {
				statements = read(forms[0], true);
			} catch (error) {
				if (!(error instanceof SyntaxError)) throw error;
				statements = read(forms[1], true);
			}
			return itemsOf(tree, statements[0], Field.specifiers);
		}
		case "importAttribute":
			return itemsOf(
				tree,
				read(`import""with{${text}};`, true)[0],
				Field.attributes
			);
		case "exportSpecifier":
			return itemsOf(
				tree,
				read(`export{${text}}from"";`, true)[0],
				Field.specifiers
			);
		default:
			throw new Error(
				`javascript syntax: ${article(typeName(tree, container))}'s ${FIELD_NAMES[field]} takes no text`
			);
	}
};

/**
 * Parses text for a field, placing the nodes at `offset` in the input.
 * @param {EditedWalk} walk the walk
 * @param {number} container the node the text goes under
 * @param {number} field its `Field`
 * @param {FieldGoal} goal what the field takes
 * @param {string} text the text
 * @param {number} offset where the nodes stand
 * @returns {number[]} the nodes, `0` for a hole
 */
const parseText = (walk, container, field, goal, text, offset) => {
	const tree = walk.tree;
	const first = tree.size + 1;
	let items;
	try {
		items = parseForField(walk, container, field, goal, text);
	} catch (error) {
		if (!(error instanceof SyntaxError)) throw error;
		throw new Error(
			`javascript syntax: ${JSON.stringify(text)} does not read as ${article(typeName(tree, container))}'s ${FIELD_NAMES[field]}: ${error.message}`,
			{ cause: error }
		);
	}
	tree.place(first, tree.size, offset);
	added(walk, first, tree.size);
	return items;
};

/**
 * Throws where text or a node does not stand in a field.
 * @param {EditedWalk} walk the walk
 * @param {number} container the node holding the field
 * @param {number} field its `Field`
 * @param {FieldGoal} goal what it takes
 * @param {number[]} items what would stand in it
 * @returns {void}
 */
const checkItems = (walk, container, field, goal, items) => {
	const tree = walk.tree;
	const where = `${article(typeName(tree, container))}'s ${FIELD_NAMES[field]}`;
	for (const item of items) {
		if (item === 0) {
			if (!goal.nullable || !isList(walk, container, field)) {
				throw new Error(`javascript syntax: ${where} holds no hole`);
			}
			continue;
		}
		if (goal.accepts === null || !goal.accepts.has(tree.type(item))) {
			throw new Error(
				`javascript syntax: ${where} holds no ${typeName(tree, item)}`
			);
		}
		if (
			(goal.goal === "string" || goal.goal === "moduleName") &&
			tree.type(item) === NodeType.Literal &&
			typeof tree.value(item) !== "string"
		) {
			throw new Error(`javascript syntax: ${where} holds a string`);
		}
	}
};

/**
 * What keeps declarators from a declaration of a kind: `const` and `using`
 * give each a value outside a `for…in` or `for…of` head, `using` binds names.
 * @param {EditedWalk} walk the walk
 * @param {number} declaration the declaration
 * @param {string} kind its kind
 * @param {number[]} declarators the declarators it would hold
 * @param {number} valueless one of them about to lose its value, `-1` for none
 * @returns {string | null} why they cannot stand, null where they can
 */
const declaratorProblem = (walk, declaration, kind, declarators, valueless) => {
	const tree = walk.tree;
	const holder = parentOf(walk, declaration);
	const isForLeft =
		holder !== 0 &&
		(tree.type(holder) === NodeType.ForInStatement ||
			tree.type(holder) === NodeType.ForOfStatement) &&
		one(tree, holder, Field.left) === declaration;
	for (const declarator of declarators) {
		if (
			kind !== "var" &&
			kind !== "let" &&
			!isForLeft &&
			(declarator === valueless || one(tree, declarator, Field.init) === 0)
		) {
			return `a ${kind} declaration gives each declarator a value`;
		}
		if (
			kind.endsWith("using") &&
			tree.type(one(tree, declarator, Field.id)) !== NodeType.Identifier
		) {
			return "a using declaration binds names only";
		}
	}
	return null;
};

/**
 * Throws where declarators an edit leaves would not stand in their
 * declaration, as `declaratorProblem` reads them.
 * @param {EditedWalk} walk the walk
 * @param {number} container the node edited
 * @param {number} field the `Field` edited
 * @param {number[]} items what the edit puts there
 * @param {boolean} emptied whether it leaves a single-node field empty
 * @returns {void}
 */
const checkDeclarators = (walk, container, field, items, emptied) => {
	const tree = walk.tree;
	let declaration = container;
	let declarators = items;
	let valueless = -1;
	if (tree.type(container) === NodeType.VariableDeclarator) {
		if (field !== Field.init || !emptied) return;
		declaration = parentOf(walk, container);
		declarators = [container];
		valueless = container;
	} else if (
		tree.type(container) !== NodeType.VariableDeclaration ||
		field !== Field.declarations
	) {
		return;
	}
	if (declaration === 0) return;
	const problem = declaratorProblem(
		walk,
		declaration,
		/** @type {string} */ (tree.textOf(Part.kind, declaration)),
		declarators,
		valueless
	);
	if (problem !== null) throw new Error(`javascript syntax: ${problem}`);
};

/**
 * Throws where an export with no `from` would export what is no binding:
 * without a module to read it from, each local name is a reference here.
 * @param {EditedWalk} walk the walk
 * @param {number} declaration the export
 * @param {number[]} specifiers its specifiers, or those an edit adds
 * @returns {void}
 */
const checkExportLocals = (walk, declaration, specifiers) => {
	const tree = walk.tree;
	if (one(tree, declaration, Field.source) !== 0) return;
	for (const specifier of specifiers) {
		const local = one(tree, specifier, Field.local);
		let reads = tree.type(local) === NodeType.Identifier;
		if (reads) {
			try {
				parseInContext(walk, declaration, `[${tree.name(local)}];`, false);
			} catch (error) {
				if (!(error instanceof SyntaxError)) throw error;
				reads = false;
			}
		}
		if (!reads) {
			throw new Error(
				`javascript syntax: an export with no source exports a binding, not ${JSON.stringify(tree.name(local) || tree.value(local))}`
			);
		}
	}
};

/**
 * Throws where a list would be left with a length its node cannot have:
 * ESTree's types do not say which lists must hold an item, or match another.
 * @param {EditedWalk} walk the walk
 * @param {number} container the node holding the list
 * @param {number} field its `Field`
 * @param {number} length the length it would have
 * @returns {void}
 */
const checkLength = (walk, container, field, length) => {
	const tree = walk.tree;
	const type = tree.type(container);
	if (
		type === NodeType.TemplateLiteral &&
		length !== tree.fieldCount(field, container)
	) {
		throw new Error(
			"javascript syntax: a TemplateLiteral keeps one more quasi than expressions; replace them one by one"
		);
	}
	if (
		length === 0 &&
		(type === NodeType.SequenceExpression ||
			type === NodeType.VariableDeclaration)
	) {
		throw new Error(
			`javascript syntax: ${article(typeName(tree, container))}'s ${FIELD_NAMES[field]} cannot be empty; remove the ${typeName(tree, container)}`
		);
	}
};

/**
 * Where a node put at the end of a field stands in the input: after what
 * the node holds in that field and in the fields before it.
 * @param {EditedWalk} walk the walk
 * @param {number} container the node
 * @param {number} field its `Field`
 * @returns {number} the offset
 */
const endOfField = (walk, container, field) => {
	const tree = walk.tree;
	let offset = tree.start(container);
	for (const { name } of descriptorOf(walk, tree.type(container)).fields) {
		const each = /** @type {Record<string, number>} */ (Field)[name];
		if (each === undefined) continue;
		for (const item of itemsOf(tree, container, each)) {
			if (item !== 0) offset = Math.max(offset, tree.end(item));
		}
		if (each === field) break;
	}
	return offset;
};

/**
 * Reads what an edit puts in a field: text parsed for it, and nodes moved
 * from where they stand, checked before anything is changed.
 * @param {EditedWalk} walk the walk
 * @param {string | number | (string | number)[]} input text or nodes
 * @param {number} container the node the field is of
 * @param {number} field the `Field`
 * @param {number} offset where parsed nodes stand in the input
 * @returns {{ items: number[], moved: number[] }} what stands in the field, and which of it moves from elsewhere
 */
const readItems = (walk, input, container, field, offset) => {
	const tree = walk.tree;
	const goal = goalOf(walk, container, field);
	const entries = Array.isArray(input) ? input : [input];
	/** @type {number[]} */
	const items = [];
	/** @type {number[]} */
	const moved = [];
	for (const entry of entries) {
		if (typeof entry === "string") {
			for (const item of parseText(
				walk,
				container,
				field,
				goal,
				entry,
				offset
			)) {
				items.push(item);
			}
			continue;
		}
		if (entry === 0) {
			items.push(0);
			continue;
		}
		checkNode(walk, entry);
		for (let n = container; n !== 0; n = parentOf(walk, n)) {
			if (n === entry) {
				throw new Error(
					`javascript syntax: ${article(typeName(tree, entry))} cannot be put inside itself`
				);
			}
		}
		if (entry !== walk.node && isWalking(walk, entry)) {
			throw new Error(
				`javascript syntax: the walk is inside the ${typeName(tree, entry)}, which cannot move until it leaves it`
			);
		}
		if (parentOf(walk, entry) !== 0) {
			const from = locate(walk, entry);
			checkWritable(walk, from.container);
			if (
				from.index === -1 &&
				!goalOf(walk, from.container, from.field).nullable
			) {
				throw new Error(
					`javascript syntax: moving the ${typeName(tree, entry)} would leave ${article(typeName(tree, from.container))}'s ${FIELD_NAMES[from.field]} empty`
				);
			}
			moved.push(entry);
		}
		items.push(entry);
	}
	checkItems(walk, container, field, goal, items);
	if (goal.goal === "exportSpecifier") {
		checkExportLocals(walk, container, items);
	}
	return { items, moved };
};

/**
 * Takes nodes out of where they stand, to stand elsewhere.
 * @param {EditedWalk} walk the walk
 * @param {number[]} moved the nodes
 * @returns {void}
 */
const takeOut = (walk, moved) => {
	for (const node of moved) {
		const from = locate(walk, node);
		if (from.index === -1) {
			walk.tree.set(from.container, FIELD_NAMES[from.field], null);
		} else {
			walk.tree.spliceList(from.container, from.field, from.index, 1, []);
		}
		detached(walk, node, from.container, true);
	}
};

/**
 * Writes nodes into a field in place of `removeCount` items from `index`.
 * @param {EditedWalk} walk the walk
 * @param {number} container the node
 * @param {number} field the `Field`
 * @param {number} index where they go, `-1` for a single-node field
 * @param {number} removeCount how many items they replace
 * @param {number[]} items the nodes
 * @returns {void}
 */
const writeField = (walk, container, field, index, removeCount, items) => {
	if (index === -1) {
		walk.tree.set(
			container,
			FIELD_NAMES[field],
			items.length === 0 ? null : items[0]
		);
	} else {
		walk.tree.spliceList(container, field, index, removeCount, items);
	}
	attached(walk, container, items);
};

/**
 * Checks what a single-node field or a list would hold after an edit.
 * @param {EditedWalk} walk the walk
 * @param {number} container the node
 * @param {number} field the `Field`
 * @param {number} count how many nodes the edit leaves in a single-node field, or the list's new length
 * @returns {void}
 */
const checkCount = (walk, container, field, count) => {
	const tree = walk.tree;
	if (isList(walk, container, field)) {
		checkLength(walk, container, field, count);
		return;
	}
	const where = `${article(typeName(tree, container))}'s ${FIELD_NAMES[field]}`;
	if (count > 1) {
		throw new Error(`javascript syntax: ${where} holds one node, not ${count}`);
	}
	if (count === 0 && !goalOf(walk, container, field).nullable) {
		throw new Error(`javascript syntax: ${where} cannot be empty`);
	}
};

/**
 * @param {EditedWalk} walk the walk
 * @param {string | number | (string | number)[]} replacement text or nodes
 * @param {number} node the node replaced
 * @returns {number[]} the nodes in its place
 */
const replaceWith = (walk, replacement, node) => {
	checkNode(walk, node);
	const location = locate(walk, node);
	checkWritable(walk, location.container);
	const { items, moved } = readItems(
		walk,
		replacement,
		location.container,
		location.field,
		walk.tree.start(node)
	);
	const length =
		location.index === -1
			? items.length
			: walk.tree.fieldCount(location.field, location.container) -
				1 +
				items.length;
	checkCount(walk, location.container, location.field, length);
	checkDeclarators(
		walk,
		location.container,
		location.field,
		items,
		items.length === 0
	);
	takeOut(
		walk,
		moved.filter((item) => item !== node)
	);
	const at = locate(walk, node);
	writeField(walk, at.container, at.field, at.index, 1, items);
	if (!items.includes(node)) detached(walk, node, at.container, false);
	return items;
};

/**
 * @param {EditedWalk} walk the walk
 * @param {"before" | "after" | number} where before or after the node, or a `Field` of it
 * @param {string | number | (string | number)[]} nodes text or nodes
 * @param {number} node the node
 * @returns {number[]} the nodes inserted
 */
const insert = (walk, where, nodes, node) => {
	checkNode(walk, node);
	const tree = walk.tree;
	if (where === "before" || where === "after") {
		const location = locate(walk, node);
		if (location.index === -1) {
			throw new Error(
				`javascript syntax: ${article(typeName(tree, location.container))}'s ${FIELD_NAMES[location.field]} holds one node; replace it instead`
			);
		}
		checkWritable(walk, location.container);
		const { items, moved } = readItems(
			walk,
			nodes,
			location.container,
			location.field,
			where === "before" ? tree.start(node) : tree.end(node)
		);
		checkCount(
			walk,
			location.container,
			location.field,
			tree.fieldCount(location.field, location.container) + items.length
		);
		checkDeclarators(walk, location.container, location.field, items, false);
		takeOut(walk, moved);
		const at = locate(walk, node);
		writeField(
			walk,
			at.container,
			at.field,
			where === "before" ? at.index : at.index + 1,
			0,
			items
		);
		return items;
	}
	if (typeof where !== "number") {
		throw new Error(
			`javascript syntax: insert() takes "before", "after" or a Field, not ${String(where)}`
		);
	}
	goalOf(walk, node, where);
	checkWritable(walk, node);
	const list = isList(walk, node, where);
	const count = tree.fieldCount(where, node);
	if (!list && count !== 0) {
		throw new Error(
			`javascript syntax: ${article(typeName(tree, node))}'s ${FIELD_NAMES[where]} holds a node already; replace it instead`
		);
	}
	const { items, moved } = readItems(
		walk,
		nodes,
		node,
		where,
		endOfField(walk, node, where)
	);
	checkCount(walk, node, where, count + items.length);
	checkDeclarators(walk, node, where, items, false);
	takeOut(walk, moved);
	writeField(
		walk,
		node,
		where,
		list ? tree.fieldCount(where, node) : -1,
		0,
		items
	);
	return items;
};

/**
 * @param {EditedWalk} walk the walk
 * @param {number} node the node removed
 * @returns {void}
 */
const remove = (walk, node) => {
	checkNode(walk, node);
	const tree = walk.tree;
	const location = locate(walk, node);
	checkWritable(walk, location.container);
	const length =
		location.index === -1
			? 0
			: walk.tree.fieldCount(location.field, location.container) - 1;
	checkCount(walk, location.container, location.field, length);
	checkDeclarators(
		walk,
		location.container,
		location.field,
		[],
		location.index === -1
	);
	if (
		location.field === Field.source &&
		tree.type(location.container) === NodeType.ExportNamedDeclaration
	) {
		// Without the module it named, its specifiers export bindings here.
		walk.tree.set(location.container, "source", null);
		try {
			checkExportLocals(
				walk,
				location.container,
				itemsOf(tree, location.container, Field.specifiers)
			);
		} finally {
			walk.tree.set(location.container, "source", node);
		}
	}
	if (location.index === -1) {
		walk.tree.set(location.container, FIELD_NAMES[location.field], null);
	} else {
		walk.tree.spliceList(
			location.container,
			location.field,
			location.index,
			1,
			[]
		);
	}
	detached(walk, node, location.container, false);
};

/**
 * @param {string} name a name
 * @returns {boolean} whether it is an IdentifierName, ECMA-262 §12.7
 */
const isIdentifierName = (name) => {
	const { isIdentifierChar, isIdentifierStart } = require("./syntax-parser");

	if (name.length === 0) return false;
	let first = true;
	for (const char of name) {
		const code = /** @type {number} */ (char.codePointAt(0));
		if (
			first ? !isIdentifierStart(code, true) : !isIdentifierChar(code, true)
		) {
			return false;
		}
		first = false;
	}
	return true;
};

/**
 * Whether a field holds a name that is no reference or binding, which any
 * IdentifierName may spell: a property's key, a member's property, a
 * module's export name.
 * @param {EditedWalk} walk the walk
 * @param {number} container the node holding the identifier
 * @param {number} field the `Field` it is in
 * @returns {boolean} whether it does
 */
const isPropertyName = (walk, container, field) => {
	const tree = walk.tree;
	if (field === Field.key || field === Field.property) {
		return !tree.flag(Flag.computed, container);
	}
	return (
		field === Field.imported ||
		field === Field.exported ||
		// `export { a as b } from "c"` names `a` in "c", binding nothing here.
		(field === Field.local &&
			tree.type(container) === NodeType.ExportSpecifier &&
			one(tree, parentOf(walk, container), Field.source) !== 0)
	);
};

/**
 * @param {EditedWalk} walk the walk
 * @param {string} name the name
 * @param {number} node an identifier
 * @returns {void}
 */
const setName = (walk, name, node) => {
	checkNode(walk, node);
	const tree = walk.tree;
	if (descriptorOf(walk, tree.type(node)).nameSlot === -1) {
		throw new Error(
			`javascript syntax: ${article(typeName(tree, node))} has no name`
		);
	}
	if (typeof name !== "string" || !isIdentifierName(name)) {
		throw new Error(
			`javascript syntax: ${JSON.stringify(name)} is no identifier name`
		);
	}
	checkWritable(walk, node);
	const container = parentOf(walk, node);
	if (tree.type(node) === NodeType.Identifier && container !== 0) {
		const { field } = locate(walk, node);
		if (tree.type(container) === NodeType.MetaProperty) {
			throw new Error(
				"javascript syntax: a MetaProperty's names are its syntax; replace it instead"
			);
		}
		if (!isPropertyName(walk, container, field)) {
			// A reserved word reads as no name where the name is a reference.
			const goal = goalOf(walk, container, field);
			try {
				parseForField(
					walk,
					container,
					field,
					goal.goal === "identifier" ? { ...goal, goal: "expression" } : goal,
					name
				);
			} catch (error) {
				if (!(error instanceof SyntaxError)) throw error;
				throw new Error(
					`javascript syntax: ${JSON.stringify(name)} cannot name ${article(typeName(tree, container))}'s ${FIELD_NAMES[field]}: ${error.message}`,
					{ cause: error }
				);
			}
		}
		clearShorthand(walk, container);
	}
	tree.set(node, "name", name);
};

/**
 * A shorthand property names its key and value once: renamed apart, it is
 * written in full.
 * @param {EditedWalk} walk the walk
 * @param {number} container the node holding the renamed identifier
 * @returns {void}
 */
const clearShorthand = (walk, container) => {
	const tree = walk.tree;
	let property = container;
	if (tree.type(property) === NodeType.AssignmentPattern) {
		property = parentOf(walk, property);
	}
	if (
		property !== 0 &&
		tree.type(property) === NodeType.Property &&
		tree.flag(Flag.shorthand, property)
	) {
		tree.set(property, "shorthand", false);
	}
};

/**
 * @param {TreeValue} value a literal's value
 * @returns {string} how it is written
 */
const rawOf = (value) => {
	if (typeof value === "string") return JSON.stringify(value);
	if (typeof value === "number") {
		if (!Number.isFinite(value) || value < 0 || Object.is(value, -0)) {
			throw new Error(
				`javascript syntax: a Literal holds no ${value}; replace it with an expression`
			);
		}
		return String(value);
	}
	if (typeof value === "bigint") {
		if (value < 0) {
			throw new Error(
				"javascript syntax: a Literal holds no negative bigint; replace it with an expression"
			);
		}
		return `${value}n`;
	}
	if (typeof value === "boolean" || value === null) return String(value);
	if (value instanceof RegExp) return `/${value.source}/${value.flags}`;
	throw new Error(`javascript syntax: a Literal holds no ${typeof value}`);
};

/**
 * Writes a literal's value from how it is written, read by the parser, and
 * keeps the directive it spells in step.
 * @param {EditedWalk} walk the walk
 * @param {number} node a literal
 * @param {string} raw how it is written
 * @returns {void}
 */
const writeLiteral = (walk, node, raw) => {
	const tree = walk.tree;
	/** @type {number[]} */
	let read;
	try {
		const program = walk.parse(`[${raw}];`, "module");
		read = itemsOf(
			tree,
			one(tree, tree.field(0, Field.body, program), Field.expression),
			Field.elements
		);
	} catch (error) {
		if (!(error instanceof SyntaxError)) throw error;
		read = [];
	}
	if (read.length !== 1 || tree.type(read[0]) !== NodeType.Literal) {
		throw new Error(`javascript syntax: ${JSON.stringify(raw)} is no literal`);
	}
	const holder = parentOf(walk, node);
	if (
		holder !== 0 &&
		tree.textOf(Part.directive, holder) !== null &&
		typeof tree.value(read[0]) !== "string"
	) {
		throw new Error(
			"javascript syntax: a directive's literal holds a string; replace its statement instead"
		);
	}
	tree.set(node, "value", tree.value(read[0]));
	tree.set(node, "raw", raw);
	if (holder !== 0 && tree.textOf(Part.directive, holder) !== null) {
		tree.set(holder, "directive", raw.slice(1, -1));
	}
};

/**
 * @param {string} cooked a template element's text
 * @returns {string} how it is written between backticks
 */
const templateRawOf = (cooked) =>
	cooked.replace(/\\|`|\$\{|\r/g, (match) =>
		match === "\r" ? "\\r" : `\\${match}`
	);

/**
 * @param {EditedWalk} walk the walk
 * @param {TreeValue} value the value
 * @param {number} node a literal or template element
 * @returns {void}
 */
const setValue = (walk, value, node) => {
	checkNode(walk, node);
	const tree = walk.tree;
	const type = tree.type(node);
	if (type === NodeType.Literal) {
		const raw = rawOf(value);
		checkWritable(walk, node);
		writeLiteral(walk, node, raw);
		return;
	}
	if (type === NodeType.TemplateElement) {
		let raw;
		if (typeof value === "string") {
			raw = templateRawOf(value);
		} else if (
			value !== null &&
			typeof value === "object" &&
			typeof (/** @type {{ raw?: unknown }} */ (value).raw) === "string"
		) {
			raw = /** @type {{ raw: string }} */ (value).raw;
		} else {
			throw new Error(
				"javascript syntax: a TemplateElement's value is its text, or `{ raw, cooked }`"
			);
		}
		checkWritable(walk, node);
		let element = 0;
		try {
			const program = walk.parse(`\`${raw}\`;`, "module");
			element = tree.field(
				0,
				Field.quasis,
				one(tree, tree.field(0, Field.body, program), Field.expression)
			);
		} catch (error) {
			if (!(error instanceof SyntaxError)) throw error;
		}
		if (element === 0) {
			throw new Error(
				`javascript syntax: ${JSON.stringify(raw)} is no template text`
			);
		}
		const read = /** @type {{ raw: string, cooked: string | null }} */ (
			tree.value(element)
		);
		if (
			typeof value === "object" &&
			/** @type {{ cooked?: unknown }} */ (value).cooked !== undefined &&
			/** @type {{ cooked?: unknown }} */ (value).cooked !== read.cooked
		) {
			throw new Error(
				`javascript syntax: ${JSON.stringify(raw)} cooks to ${JSON.stringify(read.cooked)}`
			);
		}
		tree.set(node, "value", { raw: read.raw, cooked: read.cooked });
		return;
	}
	throw new Error(
		`javascript syntax: ${article(typeName(tree, node))} has no value`
	);
};

/**
 * @param {EditedWalk} walk the walk
 * @param {number} node a node
 * @returns {boolean} whether a `ChainExpression` holds it through the calls and member reads it opens
 */
const isInChain = (walk, node) => {
	const tree = walk.tree;
	for (let n = node; n !== 0;) {
		const parent = parentOf(walk, n);
		if (parent === 0) return false;
		const type = tree.type(parent);
		if (type === NodeType.ChainExpression) return true;
		if (
			!(
				type === NodeType.MemberExpression &&
				one(tree, parent, Field.object) === n
			) &&
			!(
				type === NodeType.CallExpression &&
				one(tree, parent, Field.callee) === n
			)
		) {
			return false;
		}
		n = parent;
	}
	return false;
};

/**
 * @param {EditedWalk} walk the walk
 * @param {number} node a node
 * @returns {boolean} whether `await` reads as an operator where the node is
 */
const isAwaitAllowed = (walk, node) => {
	const fn = enclosingFunction(walk, parentOf(walk, node));
	return fn === 0
		? walk.sourceType === "module"
		: walk.tree.flag(Flag.async, fn);
};

/**
 * @param {EditedWalk} walk the walk
 * @param {number} flag a `Flag`
 * @param {boolean} on whether it is set
 * @param {number} node the node
 * @returns {void}
 */
const setFlag = (walk, flag, on, node) => {
	checkNode(walk, node);
	const tree = walk.tree;
	const name = FLAG_NAMES.get(flag);
	if (name === undefined || !hasFlag(walk, node, name)) {
		throw new Error(
			`javascript syntax: ${article(typeName(tree, node))} has no flag ${name || flag}`
		);
	}
	if (tree.flag(flag, node) === on) return;
	checkWritable(walk, node);
	const type = tree.type(node);
	/**
	 * @param {string} why what keeps the flag as it is
	 * @returns {Error} the error to throw
	 */
	const refusal = (why) =>
		new Error(
			`javascript syntax: ${article(typeName(tree, node))}'s ${name} cannot be ${on ? "set" : "cleared"}: ${why}`
		);
	const key = one(
		tree,
		node,
		type === NodeType.MemberExpression ? Field.property : Field.key
	);
	const kind = tree.textOf(Part.kind, node);
	switch (name) {
		case "computed": {
			const keyType = tree.type(key);
			if (on && keyType === NodeType.PrivateIdentifier) {
				throw refusal("a private name is never computed");
			}
			if (on && tree.flag(Flag.shorthand, node)) {
				throw refusal("it is shorthand");
			}
			if (
				!on &&
				keyType !== NodeType.Identifier &&
				!(
					keyType === NodeType.Literal &&
					type !== NodeType.MemberExpression &&
					(typeof tree.value(key) === "string" ||
						typeof tree.value(key) === "number")
				)
			) {
				throw refusal(`its ${typeName(tree, key)} key is no name`);
			}
			break;
		}
		case "optional":
			if (on && !isInChain(walk, node)) {
				throw refusal("no ChainExpression holds it; replace it with one");
			}
			break;
		case "method":
			if (
				on &&
				(tree.type(one(tree, node, Field.value)) !==
					NodeType.FunctionExpression ||
					kind !== "init" ||
					tree.flag(Flag.shorthand, node))
			) {
				throw refusal("its value is no plain function");
			}
			break;
		case "shorthand": {
			if (!on) break;
			let value = one(tree, node, Field.value);
			if (tree.type(value) === NodeType.AssignmentPattern) {
				value = one(tree, value, Field.left);
			}
			if (
				tree.flag(Flag.computed, node) ||
				tree.flag(Flag.method, node) ||
				kind !== "init" ||
				tree.type(key) !== NodeType.Identifier ||
				tree.type(value) !== NodeType.Identifier ||
				tree.name(key) !== tree.name(value)
			) {
				throw refusal("its key and value are not one name");
			}
			break;
		}
		case "delegate":
			if (on && one(tree, node, Field.argument) === 0) {
				throw refusal("it yields nothing");
			}
			break;
		case "prefix":
			if (type === NodeType.UnaryExpression) {
				throw refusal("a unary operator is always a prefix");
			}
			break;
		case "expression":
		case "tail":
			throw refusal("it follows from where the node stands");
		case "generator":
		case "async": {
			if (name === "generator" && type === NodeType.ArrowFunctionExpression) {
				throw refusal("an arrow function is never a generator");
			}
			const holder = parentOf(walk, node);
			const holderKind = holder === 0 ? null : tree.textOf(Part.kind, holder);
			if (
				on &&
				(holderKind === "get" ||
					holderKind === "set" ||
					holderKind === "constructor")
			) {
				throw refusal(`a ${holderKind} is a plain function`);
			}
			break;
		}
		case "static":
			if (on && kind === "constructor") {
				throw refusal("a constructor is never static");
			}
			break;
		case "await":
			if (on && !isAwaitAllowed(walk, node)) {
				throw refusal("no async function or module holds it");
			}
			break;
	}
	tree.set(node, name, on);
};

/**
 * Reads text as an operator or keyword of a node's type: the probe, its
 * `PART` slot filled, must parse to that type with that text.
 * @param {EditedWalk} walk the walk
 * @param {number} node the node
 * @param {number} part the `Part`
 * @param {string} probe the source to read
 * @param {string} text the text the part must read as
 * @param {(statement: number) => number} pick the node of the statement read to compare
 * @returns {boolean} whether it does
 */
const readsAs = (walk, node, part, probe, text, pick) => {
	const tree = walk.tree;
	try {
		const statements = parseInContext(walk, parentOf(walk, node), probe, false);
		const read = pick(statements[0]);
		return (
			read !== 0 &&
			tree.type(read) === tree.type(node) &&
			tree.textOf(part, read) === text
		);
	} catch (error) {
		if (!(error instanceof SyntaxError)) throw error;
		return false;
	}
};

/**
 * @param {EditedWalk} walk the walk
 * @param {number} part a `Part`
 * @param {string} text its text
 * @param {number} node the node
 * @returns {void}
 */
const setText = (walk, part, text, node) => {
	checkNode(walk, node);
	const tree = walk.tree;
	const type = tree.type(node);
	const name = PART_NAMES[part];
	if (name === undefined || descriptorOf(walk, type).partSlots[part] === -1) {
		throw new Error(
			`javascript syntax: ${article(typeName(tree, node))} has no part ${name || part}`
		);
	}
	if (typeof text !== "string") {
		throw new Error(`javascript syntax: a ${name} is text`);
	}
	/**
	 * @param {string} why what keeps the part as it is
	 * @returns {Error} the error to throw
	 */
	const refusal = (why) =>
		new Error(
			`javascript syntax: ${article(typeName(tree, node))}'s ${name} cannot be ${JSON.stringify(text)}: ${why}`
		);
	checkWritable(walk, node);
	/**
	 * @param {number} statement a probe's statement
	 * @returns {number} its expression
	 */
	const expression = (statement) => one(tree, statement, Field.expression);
	switch (name) {
		case "raw":
			writeLiteral(walk, node, text);
			return;
		case "directive":
		case "sourceType":
			throw refusal("it follows from the node's other fields");
		case "operator": {
			const prefix =
				type !== NodeType.UpdateExpression || tree.flag(Flag.prefix, node);
			const probe =
				type === NodeType.UnaryExpression
					? `(${text} a);`
					: type === NodeType.UpdateExpression
						? prefix
							? `(${text}a);`
							: `(a${text});`
						: `(a ${text} b);`;
			if (!readsAs(walk, node, part, probe, text, expression)) {
				throw refusal("it is no such operator");
			}
			if (
				type === NodeType.AssignmentExpression &&
				text !== "=" &&
				tree.type(one(tree, node, Field.left)) !== NodeType.Identifier &&
				tree.type(one(tree, node, Field.left)) !== NodeType.MemberExpression
			) {
				throw refusal("a pattern is only assigned with =");
			}
			break;
		}
		case "kind": {
			if (type === NodeType.VariableDeclaration) {
				if (!readsAs(walk, node, part, `${text} a=0;`, text, (s) => s)) {
					throw refusal("no declaration reads so here");
				}
				const problem = declaratorProblem(
					walk,
					node,
					text,
					itemsOf(tree, node, Field.declarations),
					-1
				);
				if (problem !== null) throw refusal(problem);
				break;
			}
			const value = one(tree, node, Field.value);
			const params =
				value !== 0 && tree.type(value) === NodeType.FunctionExpression
					? itemsOf(tree, value, Field.params)
					: null;
			const isPlain =
				params !== null &&
				!tree.flag(Flag.async, value) &&
				!tree.flag(Flag.generator, value);
			if (text === "get" && (!isPlain || params.length !== 0)) {
				throw refusal("a getter is a plain function of no parameters");
			} else if (
				text === "set" &&
				(!isPlain ||
					params.length !== 1 ||
					tree.type(params[0]) === NodeType.RestElement)
			) {
				throw refusal("a setter is a plain function of one parameter");
			} else if (type === NodeType.Property) {
				if (text !== "init" && text !== "get" && text !== "set") {
					throw refusal("a property is init, get or set");
				}
				if (
					text !== "init" &&
					(tree.flag(Flag.method, node) || tree.flag(Flag.shorthand, node))
				) {
					throw refusal("it is a method or shorthand");
				}
			} else if (text === "constructor") {
				const key = one(tree, node, Field.key);
				if (
					!isPlain ||
					tree.flag(Flag.static, node) ||
					tree.flag(Flag.computed, node) ||
					(tree.name(key) !== "constructor" &&
						tree.value(key) !== "constructor")
				) {
					throw refusal("a constructor is a plain method named constructor");
				}
			} else if (text !== "method" && text !== "get" && text !== "set") {
				throw refusal("a method is method, get, set or constructor");
			}
			break;
		}
		case "phase": {
			if (text !== "" && text !== "defer" && text !== "source") {
				throw refusal("a phase is defer or source");
			}
			if (type === NodeType.ImportDeclaration && text !== "") {
				const specifiers = itemsOf(tree, node, Field.specifiers);
				const wanted =
					text === "defer"
						? NodeType.ImportNamespaceSpecifier
						: NodeType.ImportDefaultSpecifier;
				if (specifiers.length !== 1 || tree.type(specifiers[0]) !== wanted) {
					throw refusal(
						text === "defer"
							? "a deferred import imports a namespace alone"
							: "a source import imports a default alone"
					);
				}
			}
			tree.set(node, name, text === "" ? undefined : text);
			return;
		}
	}
	tree.set(node, name, text);
};

module.exports = {
	startEdits,
	insert,
	remove,
	replaceWith,
	setFlag,
	setName,
	setText,
	setValue
};
