/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// cspell:ignore DEFNODE, PUNC

const fs = require("fs");
const path = require("path");
const acorn = require("acorn");
const prettier = require("prettier");

const DATA_TARGET = path.resolve(__dirname, "../lib/javascript/data.js");

// The largest code point Unicode defines, and the first one above the BMP.
const MAX_CODE_POINT = 0x10ffff;
const FIRST_ASTRAL = 0x10000;

/**
 * Run-length encode the code points a predicate accepts, as alternating
 * gap-since-the-previous-range and range-length pairs.
 * @param {(code: number) => boolean} accepts the classification to encode
 * @param {number} from first code point to ask about
 * @param {number} to last code point to ask about
 * @returns {number[]} the encoded ranges
 */
const encodeRanges = (accepts, from, to) => {
	/** @type {number[]} */
	const encoded = [];
	let previousEnd = from;
	let code = from;
	while (code <= to) {
		if (!accepts(code)) {
			code++;
			continue;
		}
		const start = code;
		while (code <= to && accepts(code)) code++;
		encoded.push(start - previousEnd, code - start);
		previousEnd = code;
	}
	return encoded;
};

/**
 * The identifier tables acorn pins, read back through its own predicates so a
 * bump of the dependency is what moves them.
 * @returns {{ start: number[], part: number[], astralStart: number[], astralPart: number[] }} the encoded tables
 */
const collectIdentifierTables = () => {
	// acorn exports the predicates at runtime but leaves them out of its types.
	const { isIdentifierStart, isIdentifierChar } =
		/** @type {{ isIdentifierStart: (code: number, astral?: boolean) => boolean, isIdentifierChar: (code: number, astral?: boolean) => boolean }} */ (
			/** @type {unknown} */ (acorn)
		);
	return {
		start: encodeRanges((code) => isIdentifierStart(code, false), 0x80, 0xffff),
		part: encodeRanges((code) => isIdentifierChar(code, false), 0x80, 0xffff),
		astralStart: encodeRanges(
			(code) => isIdentifierStart(code, true),
			FIRST_ASTRAL,
			MAX_CODE_POINT
		),
		astralPart: encodeRanges(
			(code) => isIdentifierChar(code, true),
			FIRST_ASTRAL,
			MAX_CODE_POINT
		)
	};
};

/**
 * The identifier tables terser prints against, which it freezes at Unicode 8.0
 * so its output parses in older engines: read out of its source, as it exports
 * only the predicates, and asked one code point at a time.
 * @returns {{ start: number[], part: number[] }} the encoded tables
 */
const collectNarrowIdentifierTables = () => {
	const source = fs.readFileSync(
		path.join(
			path.dirname(require.resolve("terser/package.json")),
			"lib/unicode.js"
		),
		"utf8"
	);
	/**
	 * @param {string} name the table's key in terser's `UNICODE_NARROW`
	 * @returns {RegExp} the table, matching one whole code point
	 */
	const read = (name) => {
		const match = new RegExp(`\\n\\s*${name}: (/.+/),\\n`).exec(source);
		if (match === null) {
			throw new Error(
				`terser no longer states its ${name} table where this generator reads it`
			);
		}
		// eslint-disable-next-line no-new-func
		const table = /** @type {RegExp} */ (new Function(`return ${match[1]};`)());
		return new RegExp(`^(?:${table.source})$`);
	};
	const start = read("ID_Start");
	const part = read("ID_Continue");
	return {
		start: encodeRanges(
			(code) => start.test(String.fromCodePoint(code)),
			0,
			MAX_CODE_POINT
		),
		part: encodeRanges(
			(code) => part.test(String.fromCodePoint(code)),
			0,
			MAX_CODE_POINT
		)
	};
};

// The `var` block in acorn's bundle that states the Unicode property names each
// ECMAScript edition accepts, which nothing exports.
const PROPERTY_BLOCK_START = "var scriptValuesAddedInUnicode";
const PROPERTY_BLOCK_END = "var data = {}";

/**
 * The per-edition Unicode property names, read out of acorn's own bundle: the
 * spec pins them by edition, so no dataset states them and the dependency is
 * the only place they are already written down.
 * @returns {{ binary: Record<string, string>, binaryOfStrings: Record<string, string>, generalCategory: string, script: Record<string, string> }} the tables
 */
const collectUnicodeProperties = () => {
	const bundle = fs.readFileSync(
		path.join(path.dirname(require.resolve("acorn")), "acorn.js"),
		"utf8"
	);
	const from = bundle.indexOf(PROPERTY_BLOCK_START);
	const to = bundle.indexOf(PROPERTY_BLOCK_END, from);
	if (from === -1 || to === -1) {
		throw new Error(
			"acorn no longer states its Unicode property tables where this generator reads them"
		);
	}
	const block = bundle.slice(from, to);
	// eslint-disable-next-line no-new-func
	const read = new Function(
		`${block}
		return {
			binary: unicodeBinaryProperties,
			binaryOfStrings: unicodeBinaryPropertiesOfStrings,
			generalCategory: unicodeGeneralCategoryValues,
			script: unicodeScriptValues
		};`
	);
	const tables = read();
	for (const edition of [9, 10, 11, 12, 13, 14]) {
		if (
			typeof tables.binary[edition] !== "string" ||
			typeof tables.script[edition] !== "string"
		) {
			throw new Error(
				`acorn states no Unicode properties for edition ${edition}`
			);
		}
	}
	return tables;
};

// terser's `native-objects.js` tables: what each is called there, and the
// constant it becomes here. `object_methods` is only ever expanded in place.
const NATIVE_OBJECT_TABLES = new Map([
	["pure_access_globals", "NATIVE_PURE_ACCESS_GLOBALS"],
	["pure_prop_access_globals", "NATIVE_PURE_PROP_ACCESS_GLOBALS"],
	["is_pure_native_fn", "NATIVE_PURE_FUNCTIONS"],
	["is_pure_native_method", "NATIVE_PURE_METHODS"],
	["is_pure_native_static_fn", "NATIVE_PURE_STATIC_FUNCTIONS"],
	["is_pure_native_static_property", "NATIVE_PURE_STATIC_PROPERTIES"],
	["arg1_is_iterable", "NATIVE_ARG1_IS_ITERABLE"],
	["arg1_is_range_or_iterable", "NATIVE_ARG1_IS_RANGE_OR_ITERABLE"],
	["lone_arg_is_range", "NATIVE_LONE_ARG_IS_RANGE"]
]);

/** @typedef {"sloppy" | number} NativeCondition */
/** @typedef {string | { name: string, when: NativeCondition[] }} NativeName */
/** @typedef {{ when?: NativeCondition[], names: NativeName[] }} NativeGroup */
/** @typedef {NativeName[] | Record<string, NativeGroup>} NativeTable */
/** @typedef {import("estree").Node} EstreeNode */

/**
 * @param {EstreeNode} node the node terser's source holds there
 * @param {string} expected what the generator expected to find
 * @returns {Error} the failure naming where terser's source moved
 */
const unexpectedNativeSyntax = (node, expected) =>
	new Error(
		`terser's native-objects.js holds a ${node.type} at offset ${
			/** @type {EstreeNode & { start: number }} */ (node).start
		} where this generator expects ${expected}`
	);

/**
 * Split an `a && b && c` chain into its conditions and its final value, each
 * condition read as `sloppy` or `es >= N` in the order terser evaluates them.
 * @param {EstreeNode} node the element or property value
 * @returns {{ when: NativeCondition[], value: EstreeNode }} the parts
 */
const splitNativeConditions = (node) => {
	/** @type {EstreeNode[]} */
	const operands = [];
	/**
	 * @param {EstreeNode} current a node of the chain
	 * @returns {void}
	 */
	const flatten = (current) => {
		if (current.type === "LogicalExpression" && current.operator === "&&") {
			flatten(current.left);
			flatten(current.right);
		} else {
			operands.push(current);
		}
	};
	flatten(node);
	const value = /** @type {EstreeNode} */ (operands.pop());
	/** @type {NativeCondition[]} */
	const when = operands.map((operand) => {
		if (operand.type === "Identifier" && operand.name === "sloppy") {
			return "sloppy";
		}
		if (
			operand.type === "BinaryExpression" &&
			operand.operator === ">=" &&
			operand.left.type === "Identifier" &&
			operand.left.name === "es" &&
			operand.right.type === "Literal" &&
			typeof operand.right.value === "number"
		) {
			return operand.right.value;
		}
		throw unexpectedNativeSyntax(operand, "`sloppy` or `es >= <number>`");
	});
	return { when, value };
};

/**
 * @param {EstreeNode} node an array literal of names
 * @param {Map<string, NativeName[]>} lists the plain lists declared so far
 * @returns {NativeName[]} its names, each with its conditions
 */
const readNativeNames = (node, lists) => {
	if (node.type !== "ArrayExpression") {
		throw unexpectedNativeSyntax(node, "an array of names");
	}
	/** @type {NativeName[]} */
	const names = [];
	for (const element of node.elements) {
		if (element === null) {
			throw unexpectedNativeSyntax(node, "an array without holes");
		}
		if (element.type === "SpreadElement") {
			names.push(...readNativeList(element.argument, lists));
			continue;
		}
		const { when, value } = splitNativeConditions(element);
		if (value.type !== "Literal" || typeof value.value !== "string") {
			throw unexpectedNativeSyntax(value, "a string name");
		}
		names.push(when.length === 0 ? value.value : { name: value.value, when });
	}
	return names;
};

/**
 * @param {EstreeNode} node an array literal, or a list declared earlier
 * @param {Map<string, NativeName[]>} lists the plain lists declared so far
 * @returns {NativeName[]} its names, a declared list expanded in place
 */
const readNativeList = (node, lists) => {
	if (node.type === "Identifier") {
		const list = lists.get(node.name);
		if (list === undefined) {
			throw unexpectedNativeSyntax(node, "a list declared above");
		}
		return [...list];
	}
	return readNativeNames(node, lists);
};

/**
 * @param {EstreeNode} node what a `make_lookup` or `make_nested_lookup` receives
 * @returns {EstreeNode} the value its arrow returns for `{ sloppy, es }`
 */
const readFeatureCallback = (node) => {
	if (
		node.type !== "ArrowFunctionExpression" ||
		node.params.length !== 1 ||
		node.params[0].type !== "ObjectPattern" ||
		node.params[0].properties
			.map((property) =>
				property.type === "Property" && property.key.type === "Identifier"
					? property.key.name
					: ""
			)
			.join() !== "sloppy,es" ||
		node.body.type === "BlockStatement"
	) {
		throw unexpectedNativeSyntax(node, "`({ sloppy, es }) => <table>`");
	}
	return node.body;
};

/**
 * Read one table's initializer: a `make_lookup` list, a `make_nested_lookup`
 * object of lists, a `new Set` of names or a plain list.
 * @param {EstreeNode} init the declarator's initializer
 * @param {Map<string, NativeName[]>} lists the plain lists declared so far
 * @returns {NativeTable} the table
 */
const readNativeTable = (init, lists) => {
	/**
	 * @param {EstreeNode} node an array literal outside any `{ sloppy, es }`
	 * @returns {string[]} its names, none of which can carry a condition
	 */
	const readPlainNames = (node) =>
		readNativeNames(node, lists).map((entry) => {
			if (typeof entry !== "string") {
				throw unexpectedNativeSyntax(node, "names without conditions");
			}
			return entry;
		});
	if (init.type === "ArrayExpression") {
		return readPlainNames(init);
	}
	if (
		init.type === "NewExpression" &&
		init.callee.type === "Identifier" &&
		init.callee.name === "Set" &&
		init.arguments.length === 1
	) {
		return readPlainNames(/** @type {EstreeNode} */ (init.arguments[0]));
	}
	if (
		init.type === "CallExpression" &&
		init.callee.type === "Identifier" &&
		init.arguments.length === 1
	) {
		const body = readFeatureCallback(
			/** @type {EstreeNode} */ (init.arguments[0])
		);
		if (init.callee.name === "make_lookup") {
			return readNativeNames(body, lists);
		}
		if (init.callee.name === "make_nested_lookup") {
			if (body.type !== "ObjectExpression") {
				throw unexpectedNativeSyntax(body, "an object of lists");
			}
			/** @type {Record<string, NativeGroup>} */
			const groups = {};
			for (const property of body.properties) {
				if (
					property.type !== "Property" ||
					property.computed ||
					property.kind !== "init" ||
					property.key.type !== "Identifier"
				) {
					throw unexpectedNativeSyntax(property, "`Name: <list>`");
				}
				const { when, value } = splitNativeConditions(property.value);
				const names = readNativeList(value, lists);
				groups[property.key.name] =
					when.length === 0 ? { names } : { when, names };
			}
			return groups;
		}
	}
	throw unexpectedNativeSyntax(init, "a table");
};

/**
 * The tables terser's compressor reads to decide which globals, calls and
 * properties are pure, parsed out of its `native-objects.js` source.
 * @returns {Record<string, NativeTable>} each table by its constant here
 */
const collectNativeObjects = () => {
	const source = fs.readFileSync(
		path.join(
			path.dirname(require.resolve("terser/package.json")),
			"lib/compress/native-objects.js"
		),
		"utf8"
	);
	const program = acorn.parse(source, {
		ecmaVersion: "latest",
		sourceType: "module"
	});
	/** @type {Map<string, NativeName[]>} */
	const lists = new Map();
	/** @type {Record<string, NativeTable>} */
	const tables = {};
	for (const statement of /** @type {EstreeNode[]} */ (
		/** @type {unknown} */ (program.body)
	)) {
		const declaration =
			statement.type === "ExportNamedDeclaration"
				? statement.declaration
				: statement;
		if (!declaration || declaration.type !== "VariableDeclaration") continue;
		for (const declarator of declaration.declarations) {
			if (declarator.id.type !== "Identifier" || !declarator.init) continue;
			const name = declarator.id.name;
			const init = declarator.init;
			const isTable =
				init.type === "ArrayExpression" ||
				init.type === "NewExpression" ||
				(init.type === "CallExpression" &&
					init.callee.type === "Identifier" &&
					/^make_(?:nested_)?lookup$/.test(init.callee.name));
			if (!isTable) continue;
			const table = readNativeTable(init, lists);
			if (name === "object_methods" && Array.isArray(table)) {
				lists.set(name, table);
				continue;
			}
			const constant = NATIVE_OBJECT_TABLES.get(name);
			if (constant === undefined) {
				throw new Error(
					`terser's native-objects.js declares a table \`${name}\` this generator does not know`
				);
			}
			tables[constant] = table;
		}
	}
	for (const [name, constant] of NATIVE_OBJECT_TABLES) {
		if (!tables[constant]) {
			throw new Error(
				`terser's native-objects.js no longer declares \`${name}\``
			);
		}
	}
	return tables;
};

/**
 * The native-object tables, as a section of the data module.
 * @returns {string} its source
 */
const renderNativeObjects = () => {
	const tables = collectNativeObjects();
	const listType = '(string | { name: string, when: ("sloppy" | number)[] })[]';
	const sections = Object.keys(tables).map((constant) => {
		const table = tables[constant];
		const type = !Array.isArray(table)
			? `Record<string, { when?: ("sloppy" | number)[], names: ${listType} }>`
			: table.every((entry) => typeof entry === "string")
				? "string[]"
				: listType;
		return { constant, type, source: JSON.stringify(table) };
	});
	const properties = sections
		.map(({ constant, type }) => ` * @property {${type}} ${constant}`)
		.join("\n");
	return `
/**
 * @typedef {object} NativeObjectTables
${properties}
 */

// terser's native-object tables, each name with what terser gates it on, in its
// order: "sloppy" is the \`unsafe\` option, a number N reads \`builtins_ecma >= N\`.
// Built on call, so the parser, which loads this module too, allocates none.
/**
 * @returns {NativeObjectTables} the tables, fresh on each call
 */
const nativeObjectTables = () => ({
${sections.map(({ constant, source }) => `\t${constant}: ${source}`).join(",\n")}
});
`;
};

/**
 * @param {EstreeNode} node the node terser's source holds there
 * @param {string} where the class and method it belongs to
 * @param {string} expected what the generator expected to find
 * @returns {Error} the failure naming where terser's source moved
 */
const unexpectedNodeSyntax = (node, where, expected) =>
	new Error(
		`terser's ast.js holds a ${node.type} in ${where} at offset ${
			/** @type {EstreeNode & { start: number }} */ (node).start
		} where this generator expects ${expected}`
	);

/**
 * @param {EstreeNode | null | undefined} node an expression
 * @returns {string | undefined} `field` where it reads `this.field`
 */
const readThisField = (node) =>
	node &&
	node.type === "MemberExpression" &&
	node.object.type === "ThisExpression" &&
	!node.computed &&
	node.property.type === "Identifier"
		? node.property.name
		: undefined;

/**
 * @param {EstreeNode} node a constructor's statement
 * @returns {boolean} whether it is `this.flags = 0`
 */
const isFlagsReset = (node) =>
	node.type === "ExpressionStatement" &&
	node.expression.type === "AssignmentExpression" &&
	readThisField(/** @type {EstreeNode} */ (node.expression.left)) === "flags" &&
	node.expression.right.type === "Literal" &&
	node.expression.right.value === 0;

/**
 * The source of a value a node class sets on its prototype, as terser writes
 * them: a literal, `1/0`, `0/0`, or a call of an empty function for undefined.
 * @param {EstreeNode} node the value's expression
 * @returns {string | undefined} its source, or undefined where it is not a value
 */
const readPrototypeValue = (node) => {
	if (node.type === "Identifier") return undefined;
	if (node.type === "Literal" && typeof node.value !== "object") {
		return JSON.stringify(node.value);
	}
	if (node.type === "Literal" && node.value === null) return "null";
	if (
		node.type === "BinaryExpression" &&
		node.operator === "/" &&
		node.left.type === "Literal" &&
		node.right.type === "Literal" &&
		node.right.value === 0
	) {
		return node.left.value === 0 ? "NaN" : "Infinity";
	}
	if (
		node.type === "CallExpression" &&
		node.arguments.length === 0 &&
		node.callee.type === "FunctionExpression" &&
		node.callee.body.body.length === 0
	) {
		return "undefined";
	}
	throw unexpectedNodeSyntax(node, "a node class's prototype", "a value");
};

/**
 * @param {EstreeNode} node a constructor's statement
 * @returns {boolean} whether it is `this.field = props.field`
 */
const isPropsCopy = (node) =>
	node.type === "ExpressionStatement" &&
	node.expression.type === "AssignmentExpression" &&
	readThisField(/** @type {EstreeNode} */ (node.expression.left)) !==
		undefined &&
	node.expression.right.type === "MemberExpression" &&
	node.expression.right.object.type === "Identifier" &&
	node.expression.right.object.name === "props";

/**
 * @param {EstreeNode} node a statement
 * @returns {EstreeNode[]} it, or the statements of the block it is
 */
const statementsOf = (node) =>
	node.type === "BlockStatement" ? node.body : [node];

/**
 * @param {EstreeNode} node an expression
 * @param {string} method `_walk` or `push`
 * @returns {EstreeNode | undefined} what it walks or pushes, where it does
 */
const readVisited = (node, method) => {
	if (node.type !== "CallExpression") return undefined;
	const { callee } = node;
	if (method === "push") {
		return callee.type === "Identifier" &&
			callee.name === "push" &&
			node.arguments.length === 1
			? /** @type {EstreeNode} */ (node.arguments[0])
			: undefined;
	}
	return callee.type === "MemberExpression" &&
		!callee.computed &&
		callee.property.type === "Identifier" &&
		(callee.property.name === "_walk" || callee.property.name === "walk") &&
		node.arguments.length === 1 &&
		node.arguments[0].type === "Identifier" &&
		node.arguments[0].name === "visitor"
		? /** @type {EstreeNode} */ (callee.object)
		: undefined;
};

/**
 * The children a `_walk` or `_children_backwards` reaches, in the order it
 * reaches them: `f` a child that is always there, `?f` one that may be absent,
 * `~f` one that may not be a node, `*f` a list, `?*f` a list that may be absent.
 * @param {EstreeNode[]} statements the method's body
 * @param {string} method `_walk` or `push`
 * @param {string} where the class and method, for the error
 * @returns {string[]} the children
 */
const readChildren = (statements, method, where) => {
	/** @type {string[]} */
	const children = [];
	/** @type {Map<string, string>} */
	const aliases = new Map();
	/**
	 * @param {EstreeNode} node an expression read element by element
	 * @returns {string | undefined} the list field it reads
	 */
	const listOf = (node) =>
		node.type === "Identifier" ? aliases.get(node.name) : readThisField(node);
	/**
	 * @param {EstreeNode} statement one statement of the body
	 * @param {string} prefix `?` where it runs only when its field is set
	 * @returns {void}
	 */
	const read = (statement, prefix) => {
		if (statement.type === "ExpressionStatement") {
			const expression = statement.expression;
			const visited = readVisited(expression, method);
			const field = visited && readThisField(visited);
			if (field !== undefined) {
				children.push(`${prefix}${field}`);
				return;
			}
			// `walk_body(this, visitor)` walks `body`.
			if (
				method !== "push" &&
				expression.type === "CallExpression" &&
				expression.callee.type === "Identifier" &&
				expression.callee.name === "walk_body"
			) {
				children.push(`${prefix}*body`);
				return;
			}
			// `this.field.forEach((item) => item._walk(visitor))`.
			if (
				expression.type === "CallExpression" &&
				expression.callee.type === "MemberExpression" &&
				!expression.callee.computed &&
				expression.callee.property.type === "Identifier" &&
				expression.callee.property.name === "forEach"
			) {
				const list = listOf(
					/** @type {EstreeNode} */ (expression.callee.object)
				);
				if (list !== undefined) {
					children.push(`${prefix}*${list}`);
					return;
				}
			}
		}
		if (statement.type === "VariableDeclaration") {
			for (const declarator of statement.declarations) {
				const field = readThisField(
					/** @type {EstreeNode} */ (declarator.init)
				);
				if (declarator.id.type === "Identifier" && field !== undefined) {
					aliases.set(declarator.id.name, field);
					continue;
				}
				// `let i = this.field.length`, the count a backwards loop runs down.
				const init = /** @type {EstreeNode} */ (declarator.init);
				if (
					init.type === "MemberExpression" &&
					!init.computed &&
					init.property.type === "Identifier" &&
					init.property.name === "length" &&
					readThisField(/** @type {EstreeNode} */ (init.object)) !== undefined
				) {
					continue;
				}
				throw unexpectedNodeSyntax(statement, where, "a list read once");
			}
			return;
		}
		// `i = this.field.length`, a backwards loop's count reused.
		if (
			statement.type === "ExpressionStatement" &&
			statement.expression.type === "AssignmentExpression"
		) {
			return;
		}
		if (
			statement.type === "ForStatement" ||
			statement.type === "WhileStatement"
		) {
			const body = statementsOf(statement.body);
			const visited =
				body.length === 1 && body[0].type === "ExpressionStatement"
					? readVisited(body[0].expression, method)
					: undefined;
			if (visited && visited.type === "MemberExpression" && visited.computed) {
				const list = listOf(/** @type {EstreeNode} */ (visited.object));
				if (list !== undefined) {
					children.push(`${prefix}*${list}`);
					return;
				}
			}
			throw unexpectedNodeSyntax(statement, where, "a loop over a list");
		}
		if (statement.type === "IfStatement" && !statement.alternate) {
			const { test } = statement;
			const field = readThisField(test);
			if (field !== undefined) {
				const before = children.length;
				for (const inner of statementsOf(statement.consequent)) {
					read(inner, "?");
				}
				for (let i = before; i < children.length; i++) {
					if (children[i].replace(/^\?\*?/, "") !== field) {
						throw unexpectedNodeSyntax(statement, where, `only \`${field}\``);
					}
				}
				return;
			}
			if (
				test.type === "BinaryExpression" &&
				test.operator === "instanceof" &&
				test.right.type === "Identifier" &&
				test.right.name === "AST_Node"
			) {
				const tested = readThisField(/** @type {EstreeNode} */ (test.left));
				const inner = statementsOf(statement.consequent);
				const visited =
					inner.length === 1 && inner[0].type === "ExpressionStatement"
						? readVisited(inner[0].expression, method)
						: undefined;
				if (tested !== undefined && readThisField(visited) === tested) {
					children.push(`~${tested}`);
					return;
				}
			}
		}
		throw unexpectedNodeSyntax(statement, where, "a child walked or pushed");
	};
	for (const statement of statements) read(statement, "");
	return children;
};

/**
 * @typedef {object} NodeClass
 * @property {string} type the class's `TYPE`
 * @property {string | null} base the `TYPE` of the class it extends
 * @property {string[]} fields what its constructor copies off its argument, in order
 * @property {boolean} initializes whether its constructor then calls `initialize`
 * @property {boolean} guarded whether it copies only where given an argument
 * @property {boolean} setsFlags whether it then sets `flags` to 0
 * @property {Record<string, string>} values the source of each value it sets on its prototype
 * @property {string[] | null} walk the children its own `_walk` visits, null where it inherits one
 * @property {string | null} guard the field a walk visits children only when set
 * @property {string[] | null} backwards the children its own `_children_backwards` pushes, null where it inherits one
 */

/**
 * terser's node classes, parsed out of its `ast.js`: each one's place in the
 * hierarchy, the fields its constructor copies and the children it walks.
 * @returns {NodeClass[]} the classes, in the order terser defines them
 */
const collectNodeClasses = () => {
	const source = fs.readFileSync(
		path.join(
			path.dirname(require.resolve("terser/package.json")),
			"lib/ast.js"
		),
		"utf8"
	);
	const program = acorn.parse(source, {
		ecmaVersion: "latest",
		sourceType: "module"
	});
	/** @type {Map<string, string>} */
	const typeOf = new Map();
	/** @type {NodeClass[]} */
	const classes = [];
	for (const statement of /** @type {EstreeNode[]} */ (
		/** @type {unknown} */ (program.body)
	)) {
		if (statement.type !== "VariableDeclaration") continue;
		for (const declarator of statement.declarations) {
			const init = /** @type {EstreeNode | null} */ (declarator.init);
			if (
				!init ||
				init.type !== "CallExpression" ||
				init.callee.type !== "Identifier" ||
				init.callee.name !== "DEFNODE"
			) {
				continue;
			}
			const [typeNode, , ctorNode, methodsNode, baseNode] =
				/** @type {EstreeNode[]} */ (init.arguments);
			if (
				typeNode.type !== "Literal" ||
				typeof typeNode.value !== "string" ||
				ctorNode.type !== "FunctionExpression" ||
				declarator.id.type !== "Identifier"
			) {
				throw unexpectedNodeSyntax(init, "DEFNODE", "a named node class");
			}
			const type = typeNode.value;
			typeOf.set(declarator.id.name, type);
			/** @type {string | null} */
			let base = "Node";
			if (baseNode === undefined) {
				base = type === "Node" ? null : "Node";
			} else if (baseNode.type === "Literal") {
				base = null;
			} else if (baseNode.type === "Identifier") {
				base = /** @type {string} */ (typeOf.get(baseNode.name));
			}
			/** @type {string[]} */
			const fields = [];
			let initializes = false;
			let guarded = false;
			let setsFlags = false;
			for (const inner of ctorNode.body.body) {
				// Most constructors copy under `if (props)`; `ClassStaticBlock` copies
				// unguarded, and is the one that never sets `this.flags = 0`.
				if (isFlagsReset(inner)) {
					setsFlags = true;
					continue;
				}
				if (inner.type === "IfStatement") {
					guarded = true;
				} else if (!isPropsCopy(inner)) {
					throw unexpectedNodeSyntax(
						inner,
						`${type}'s constructor`,
						"a field copied"
					);
				}
				const assignments =
					inner.type === "IfStatement"
						? statementsOf(inner.consequent)
						: [inner];
				for (const assignment of assignments) {
					const expression =
						assignment.type === "ExpressionStatement"
							? assignment.expression
							: undefined;
					if (
						expression &&
						expression.type === "CallExpression" &&
						readThisField(/** @type {EstreeNode} */ (expression.callee)) ===
							"initialize"
					) {
						initializes = true;
						continue;
					}
					const field =
						expression && expression.type === "AssignmentExpression"
							? readThisField(/** @type {EstreeNode} */ (expression.left))
							: undefined;
					if (field === undefined) {
						throw unexpectedNodeSyntax(
							assignment,
							`${type}'s constructor`,
							"a field copied"
						);
					}
					fields.push(field);
				}
			}
			/** @type {NodeClass} */
			const nodeClass = {
				type,
				base,
				fields,
				initializes,
				guarded,
				setsFlags,
				values: {},
				walk: null,
				guard: null,
				backwards: null
			};
			if (methodsNode && methodsNode.type === "ObjectExpression") {
				for (const property of methodsNode.properties) {
					if (
						property.type !== "Property" ||
						property.key.type !== "Identifier"
					) {
						continue;
					}
					const fn = /** @type {EstreeNode} */ (property.value);
					if (
						fn.type !== "FunctionExpression" &&
						fn.type !== "ArrowFunctionExpression"
					) {
						// `$`-prefixed members are terser's documentation, set on the class.
						const value =
							property.key.name[0] === "$" ? undefined : readPrototypeValue(fn);
						if (value !== undefined) {
							nodeClass.values[property.key.name] = value;
						}
						continue;
					}
					const body = fn.body.type === "BlockStatement" ? fn.body.body : [];
					if (property.key.name === "_walk") {
						const returned = body.length === 1 ? body[0] : undefined;
						const visit =
							returned &&
							returned.type === "ReturnStatement" &&
							returned.argument &&
							returned.argument.type === "CallExpression"
								? returned.argument
								: undefined;
						if (!visit) {
							throw unexpectedNodeSyntax(fn, `${type}._walk`, "a visit");
						}
						let descend = /** @type {EstreeNode | undefined} */ (
							visit.arguments[1]
						);
						if (
							descend &&
							descend.type === "LogicalExpression" &&
							descend.operator === "&&"
						) {
							nodeClass.guard =
								readThisField(/** @type {EstreeNode} */ (descend.left)) || null;
							descend = /** @type {EstreeNode} */ (descend.right);
						}
						if (descend === undefined) {
							nodeClass.walk = [];
							continue;
						}
						if (
							descend.type !== "FunctionExpression" ||
							descend.body.type !== "BlockStatement"
						) {
							throw unexpectedNodeSyntax(descend, `${type}._walk`, "a descent");
						}
						nodeClass.walk = readChildren(
							descend.body.body,
							"_walk",
							`${type}._walk`
						);
					} else if (property.key.name === "_children_backwards") {
						nodeClass.backwards = readChildren(
							body,
							"push",
							`${type}._children_backwards`
						);
					}
				}
			}
			classes.push(nodeClass);
		}
	}
	return classes;
};

/**
 * terser's node classes, as a section of the data module.
 * @returns {string} its source
 */
const renderNodeClasses = () => `
/**
 * A node class of terser's: \`walk\` and \`backwards\` list its children in the
 * order its own \`_walk\` and \`_children_backwards\` reach them, null where it
 * inherits them — \`f\` a child always there, \`?f\` one that may be absent,
 * \`~f\` one that may not be a node, \`*f\` a list, \`?*f\` a list that may be absent.
 * @typedef {object} NodeClass
 * @property {string} type its \`TYPE\`
 * @property {string | null} base the \`TYPE\` of the class it extends
 * @property {string[]} fields what its constructor copies off its argument, in order
 * @property {boolean} initializes whether its constructor then calls \`initialize\`
 * @property {boolean} guarded whether it copies only where given an argument
 * @property {boolean} setsFlags whether it then sets \`flags\` to 0
 * @property {Record<string, string>} values the source of each value it sets on its prototype
 * @property {string[] | null} walk the children its walk visits
 * @property {string | null} guard the field its walk descends only where set
 * @property {string[] | null} backwards the children it pushes backwards
 */

// terser's node classes, in the order its \`ast.js\` defines them, each after
// the class it extends. Built on call, so the parser allocates none.
/**
 * @returns {NodeClass[]} the classes, fresh on each call
 */
const nodeClasses = () => ${JSON.stringify(collectNodeClasses())};
`;

/**
 * @param {EstreeNode} node the node terser's source holds there
 * @param {string} expected what the generator expected to find
 * @returns {Error} the failure naming where terser's source moved
 */
const unexpectedParserSyntax = (node, expected) =>
	new Error(
		`terser's parse.js holds a ${node.type} at offset ${
			/** @type {EstreeNode & { start: number }} */ (node).start
		} where this generator expects ${expected}`
	);

/** @typedef {string | string[] | { words: string[] } | { levels: string[][] }} ParserValue */

/**
 * The value of one of terser's table declarations, as far as tables are
 * written: strings, their concatenation, `makePredicate` over words and
 * `characters` over a string, and the IIFE that numbers operator precedence.
 * @param {EstreeNode} node the expression
 * @param {Map<string, ParserValue>} known the tables read before it
 * @returns {ParserValue} its value
 */
const evaluateParserTable = (node, known) => {
	if (node.type === "Literal" && typeof node.value === "string") {
		return node.value;
	}
	if (node.type === "Identifier" && known.has(node.name)) {
		return /** @type {ParserValue} */ (known.get(node.name));
	}
	if (node.type === "BinaryExpression" && node.operator === "+") {
		const left = evaluateParserTable(
			/** @type {EstreeNode} */ (node.left),
			known
		);
		const right = evaluateParserTable(node.right, known);
		if (typeof left === "string" && typeof right === "string") {
			return left + right;
		}
	}
	if (node.type === "ArrayExpression") {
		return node.elements.map((element) => {
			if (element === null || element.type === "SpreadElement") {
				throw unexpectedParserSyntax(node, "an array of strings without holes");
			}
			const value = evaluateParserTable(
				/** @type {EstreeNode} */ (element),
				known
			);
			if (typeof value !== "string") {
				throw unexpectedParserSyntax(
					/** @type {EstreeNode} */ (element),
					"a string"
				);
			}
			return value;
		});
	}
	if (node.type === "CallExpression") {
		const { callee } = node;
		const [argument] = /** @type {EstreeNode[]} */ (node.arguments);
		if (callee.type === "Identifier" && callee.name === "characters") {
			const value = evaluateParserTable(argument, known);
			if (typeof value === "string") return [...value];
		}
		if (callee.type === "Identifier" && callee.name === "makePredicate") {
			const value = evaluateParserTable(argument, known);
			// terser's `makePredicate` splits a string at spaces and sorts the words.
			const words = typeof value === "string" ? value.split(" ") : value;
			if (Array.isArray(words)) return { words: [...words].sort() };
		}
		// The precedence table: an IIFE numbering each group of operators.
		if (
			callee.type === "FunctionExpression" &&
			argument &&
			argument.type === "ArrayExpression"
		) {
			return {
				levels: argument.elements.map(
					(level) =>
						/** @type {string[]} */ (
							evaluateParserTable(/** @type {EstreeNode} */ (level), known)
						)
				)
			};
		}
	}
	throw unexpectedParserSyntax(node, "a table");
};

// terser's `parse.js` tables the parser port reads, and the predefined type
// names its TypeScript stripping declares inside `parse`.
const PARSER_TABLES = [
	"KEYWORDS",
	"KEYWORDS_ATOM",
	"RESERVED_WORDS",
	"ALL_RESERVED_WORDS",
	"KEYWORDS_BEFORE_EXPRESSION",
	"OPERATOR_CHARS",
	"OPERATORS",
	"WHITESPACE_CHARS",
	"NEWLINE_CHARS",
	"PUNC_AFTER_EXPRESSION",
	"PUNC_BEFORE_EXPRESSION",
	"PUNC_CHARS",
	"UNARY_PREFIX",
	"UNARY_POSTFIX",
	"ASSIGNMENT",
	"LOGICAL_ASSIGNMENT",
	"PRECEDENCE",
	"ATOMIC_START_TOKEN",
	"_TS_PREDEFINED_TYPES"
];

/**
 * terser's tokenizer and parser tables, parsed out of its `parse.js`: each a
 * list of words in the order terser's `makePredicate` holds them, and the
 * operators of each precedence level, loosest first.
 * @returns {Record<string, string[] | string[][]>} each table by its name there
 */
const collectParserTables = () => {
	const source = fs.readFileSync(
		path.join(
			path.dirname(require.resolve("terser/package.json")),
			"lib/parse.js"
		),
		"utf8"
	);
	const program = acorn.parse(source, {
		ecmaVersion: "latest",
		sourceType: "module"
	});
	/** @type {Map<string, ParserValue>} */
	const known = new Map();
	/**
	 * @param {EstreeNode[]} statements a body
	 * @returns {void}
	 */
	const read = (statements) => {
		for (const statement of statements) {
			if (statement.type === "VariableDeclaration") {
				for (const declarator of statement.declarations) {
					if (
						declarator.id.type !== "Identifier" ||
						!PARSER_TABLES.includes(declarator.id.name) ||
						!declarator.init
					) {
						continue;
					}
					known.set(
						declarator.id.name,
						evaluateParserTable(
							/** @type {EstreeNode} */ (declarator.init),
							known
						)
					);
				}
			} else if (
				statement.type === "ExpressionStatement" &&
				statement.expression.type === "AssignmentExpression" &&
				statement.expression.left.type === "Identifier" &&
				PARSER_TABLES.includes(statement.expression.left.name)
			) {
				known.set(
					statement.expression.left.name,
					evaluateParserTable(statement.expression.right, known)
				);
			} else if (
				statement.type === "FunctionDeclaration" &&
				statement.id &&
				statement.id.name === "parse"
			) {
				read(statement.body.body);
			}
		}
	};
	read(/** @type {EstreeNode[]} */ (/** @type {unknown} */ (program.body)));
	/** @type {Record<string, string[] | string[][]>} */
	const tables = {};
	for (const name of PARSER_TABLES) {
		const value = known.get(name);
		if (value === undefined) {
			throw new Error(`terser's parse.js no longer declares \`${name}\``);
		}
		if (typeof value === "string") {
			throw new Error(`terser's parse.js leaves \`${name}\` a string`);
		}
		tables[name.replace(/^_/, "")] = Array.isArray(value)
			? value
			: "words" in value
				? value.words
				: value.levels;
	}
	return tables;
};

/**
 * The DOM's property names terser's `tools/domprops.js` lists, which property
 * mangling leaves alone unless told otherwise.
 * @returns {string[]} the names, in terser's order
 */
const collectDomProperties = () => {
	const source = fs.readFileSync(
		path.join(
			path.dirname(require.resolve("terser/package.json")),
			"tools/domprops.js"
		),
		"utf8"
	);
	const program = acorn.parse(source, {
		ecmaVersion: "latest",
		sourceType: "module"
	});
	for (const statement of /** @type {EstreeNode[]} */ (
		/** @type {unknown} */ (program.body)
	)) {
		const declaration =
			statement.type === "ExportNamedDeclaration"
				? /** @type {EstreeNode | null | undefined} */ (statement.declaration)
				: statement;
		if (!declaration || declaration.type !== "VariableDeclaration") continue;
		for (const declarator of declaration.declarations) {
			if (
				declarator.id.type === "Identifier" &&
				declarator.id.name === "domprops" &&
				declarator.init &&
				declarator.init.type === "ArrayExpression"
			) {
				return /** @type {string[]} */ (
					evaluateParserTable(
						/** @type {EstreeNode} */ (declarator.init),
						new Map()
					)
				);
			}
		}
	}
	throw new Error("terser's tools/domprops.js no longer declares `domprops`");
};

/**
 * terser's DOM property names, as a section of the data module.
 * @returns {string} its source
 */
const renderDomProperties = () => {
	const names = collectDomProperties();
	for (const name of names) {
		if (/\s/.test(name)) {
			throw new Error(
				`terser's DOM property name ${JSON.stringify(name)} holds a space`
			);
		}
	}
	return `
// The DOM's property names terser's \`tools/domprops.js\` lists, space separated.
/**
 * @returns {string[]} the names, fresh on each call
 */
const domProperties = () => ${JSON.stringify(names.join(" "))}.split(" ");
`;
};

/**
 * terser's parser tables, as a section of the data module.
 * @returns {string} its source
 */
const renderParserTables = () => `
// terser's tokenizer and parser tables, read out of its \`parse.js\`: each a
// list of words, and \`PRECEDENCE\` the operators of each level, loosest first.
/**
 * @returns {Record<string, string[] | string[][]>} the tables, fresh on each call
 */
const parserTables = () => (${JSON.stringify(collectParserTables())
	.replace(
		/[^\u0020-\u007E]/g,
		(char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`
	)
	// Upper case, as the linter writes an escape, JSON's own ones included.
	.replace(
		/\\u[\dA-Fa-f]{4}/g,
		(escape) => `\\u${escape.slice(2).toUpperCase()}`
	)});
`;

/**
 * Render one encoded table as a module-scope constant.
 * @param {string} name the constant's name
 * @param {string} description what the table holds
 * @param {number[]} ranges the encoded ranges
 * @param {number} base the code point the first gap counts from
 * @returns {string} the source for it
 */
const renderTable = (name, description, ranges, base) =>
	`// ${description}\n// Pairs of gap-since-the-previous-range and range-length, from ${`0x${base.toString(
		16
	)}`}.\n/** @type {number[]} */\nconst ${name} = [${ranges.join(",")}];\n`;

/**
 * The header every generated module here opens with.
 * @returns {string} its source
 */
const renderHeader = () => `/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

// GENERATED by tooling/generate-js-data.js — do not edit.
// Sources: acorn ${acorn.version}, terser ${
	require("terser/package.json").version
}. The tables read from terser are under its
// license, quoted in full in syntax-printer.js.

"use strict";
`;

/**
 * Build the module the parser classifies with: the identifier ranges the
 * tokenizer reads, the property names `\\p{...}` accepts and the native
 * objects the compressor knows to be pure.
 * @returns {string} its source
 */
const renderData = () => {
	const tables = collectIdentifierTables();
	const narrow = collectNarrowIdentifierTables();
	return `${renderHeader()}
${renderTable(
	"IDENTIFIER_START_RANGES",
	"Non-ASCII code points in the BMP that may start an identifier.",
	tables.start,
	0x80
)}
${renderTable(
	"IDENTIFIER_PART_RANGES",
	"Non-ASCII code points in the BMP that may continue an identifier.",
	tables.part,
	0x80
)}
${renderTable(
	"ASTRAL_IDENTIFIER_START_RANGES",
	"Code points above the BMP that may start an identifier.",
	tables.astralStart,
	FIRST_ASTRAL
)}
${renderTable(
	"ASTRAL_IDENTIFIER_PART_RANGES",
	"Code points above the BMP that may continue an identifier.",
	tables.astralPart,
	FIRST_ASTRAL
)}
${renderTable(
	"NARROW_IDENTIFIER_START_RANGES",
	"Code points that may start an identifier as of Unicode 8.0, which the printer writes unescaped.",
	narrow.start,
	0
)}
${renderTable(
	"NARROW_IDENTIFIER_PART_RANGES",
	"Code points that may continue an identifier as of Unicode 8.0, which the printer writes unescaped.",
	narrow.part,
	0
)}
${renderUnicodeProperties()}${renderNativeObjects()}${renderNodeClasses()}${renderParserTables()}${renderDomProperties()}
module.exports.ASTRAL_IDENTIFIER_PART_RANGES = ASTRAL_IDENTIFIER_PART_RANGES;
module.exports.ASTRAL_IDENTIFIER_START_RANGES = ASTRAL_IDENTIFIER_START_RANGES;
module.exports.IDENTIFIER_PART_RANGES = IDENTIFIER_PART_RANGES;
module.exports.IDENTIFIER_START_RANGES = IDENTIFIER_START_RANGES;
module.exports.NARROW_IDENTIFIER_PART_RANGES = NARROW_IDENTIFIER_PART_RANGES;
module.exports.NARROW_IDENTIFIER_START_RANGES = NARROW_IDENTIFIER_START_RANGES;
module.exports.UNICODE_BINARY_PROPERTIES = UNICODE_BINARY_PROPERTIES;
module.exports.UNICODE_BINARY_PROPERTIES_OF_STRINGS =
	UNICODE_BINARY_PROPERTIES_OF_STRINGS;
module.exports.UNICODE_GENERAL_CATEGORY_VALUES = UNICODE_GENERAL_CATEGORY_VALUES;
module.exports.UNICODE_SCRIPT_VALUES = UNICODE_SCRIPT_VALUES;
module.exports.domProperties = domProperties;
module.exports.nativeObjectTables = nativeObjectTables;
module.exports.nodeClasses = nodeClasses;
module.exports.parserTables = parserTables;
`;
};

/**
 * The Unicode property names `\\p{...}` accepts, as a section of that module.
 * @returns {string} its source
 */
const renderUnicodeProperties = () => {
	const properties = collectUnicodeProperties();
	return `
// The Unicode property names each ECMAScript edition accepts in \\p{...}.
/** @type {Record<string, string>} */
const UNICODE_BINARY_PROPERTIES = ${JSON.stringify(properties.binary, null, 1)};

/** @type {Record<string, string>} */
const UNICODE_BINARY_PROPERTIES_OF_STRINGS = ${JSON.stringify(
		properties.binaryOfStrings,
		null,
		1
	)};

/** @type {string} */
const UNICODE_GENERAL_CATEGORY_VALUES = ${JSON.stringify(
		properties.generalCategory
	)};

/** @type {Record<string, string>} */
const UNICODE_SCRIPT_VALUES = ${JSON.stringify(properties.script, null, 1)};
`;
};

/**
 * Write one generated module, or report that it is stale.
 * @param {string} target where it belongs
 * @param {string} source what it should hold
 * @returns {Promise<void>} settles once the file is written or checked
 */
const writeGenerated = async (target, source) => {
	const write = process.argv.includes("--write");
	const name = `lib/javascript/${path.basename(target)}`;
	const config = await prettier.resolveConfig(target);
	const formatted = await prettier.format(source, {
		...config,
		filepath: target
	});
	const current = fs.existsSync(target)
		? fs.readFileSync(target, "utf8")
		: null;
	if (current === formatted) {
		process.stdout.write(`${name} is up to date\n`);
		return;
	}
	if (write) {
		fs.writeFileSync(target, formatted);
		process.stdout.write(`${name} updated\n`);
		return;
	}
	process.stderr.write(`${name} is out of date — run \`yarn fix:special\`\n`);
	process.exitCode = 1;
};

/**
 * Write the generated module, or report that it is stale.
 * @returns {Promise<void>} settles once it is written or checked
 */
const generate = async () => {
	await writeGenerated(DATA_TARGET, renderData());
};

if (require.main === module) {
	// `generate` is async, so a failed generation has to be turned back into a
	// non-zero exit rather than left as an unhandled rejection.
	generate().catch((error) => {
		process.stderr.write(`${error.stack}\n`);
		process.exitCode = 1;
	});
}

module.exports.DATA_TARGET = DATA_TARGET;
module.exports.collectDomProperties = collectDomProperties;
module.exports.collectIdentifierTables = collectIdentifierTables;
module.exports.collectNarrowIdentifierTables = collectNarrowIdentifierTables;
module.exports.collectNativeObjects = collectNativeObjects;
module.exports.collectNodeClasses = collectNodeClasses;
module.exports.collectParserTables = collectParserTables;
module.exports.collectUnicodeProperties = collectUnicodeProperties;
module.exports.encodeRanges = encodeRanges;
