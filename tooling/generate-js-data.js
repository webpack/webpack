/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// cspell:ignore DEFNODE, PUNC, argnames, bcatch, bfinally, argname, thedef, Defun, Funarg, funarg

const fs = require("fs");
const path = require("path");
const bcd =
	/** @type {{ javascript: { builtins: { [name: string]: { __compat: BcdCompat } & BcdMembers } }, __meta: { version: string } }} */ (
		/** @type {unknown} */ (require("@mdn/browser-compat-data"))
	);
const acorn = require("acorn");

/** @typedef {{ version_added?: string | boolean | null }} BcdSupport */
/** @typedef {{ spec_url?: string | string[], mdn_url?: string, status?: { standard_track: boolean, deprecated: boolean }, support: Record<string, BcdSupport | BcdSupport[]> }} BcdCompat */
/** @typedef {{ [name: string]: { __compat: BcdCompat } }} BcdMembers */

const DATA_TARGET = path.resolve(__dirname, "../lib/javascript/data.js");
const PRINTER_DATA_TARGET = path.resolve(
	__dirname,
	"../lib/javascript/syntax-printer-data.js"
);

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

// terser's `parse.js` tables the printer reads: the words its tokens are named
// by, what a name may not be, and each operator's precedence.
const PARSER_TABLES = [
	"KEYWORDS",
	"KEYWORDS_ATOM",
	"RESERVED_WORDS",
	"ALL_RESERVED_WORDS",
	"OPERATORS",
	"PRECEDENCE"
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

// The built-ins `improve` evaluates on literals: `global`'s functions, `X`'s
// statics, `X.prototype`'s methods. Each exactly specified, reading only its
// receiver and arguments, and answering a primitive.
const FOLDED_BUILT_INS = {
	global: [
		"decodeURI",
		"decodeURIComponent",
		"encodeURI",
		"encodeURIComponent",
		"isFinite",
		"isNaN",
		"parseFloat",
		"parseInt"
	],
	Math: [
		"abs",
		"ceil",
		"clz32",
		"floor",
		"fround",
		"imul",
		"max",
		"min",
		"round",
		"sign",
		"sqrt",
		"trunc"
	],
	Number: [
		"isFinite",
		"isInteger",
		"isNaN",
		"isSafeInteger",
		"parseFloat",
		"parseInt"
	],
	String: ["fromCharCode", "fromCodePoint"],
	"String.prototype": [
		"charAt",
		"charCodeAt",
		"codePointAt",
		"concat",
		"endsWith",
		"includes",
		"indexOf",
		"lastIndexOf",
		"normalize",
		"padEnd",
		"padStart",
		"repeat",
		"replace",
		"slice",
		"startsWith",
		"substr",
		"substring",
		"toLowerCase",
		"toUpperCase",
		"trim",
		"trimEnd",
		"trimStart"
	],
	"Array.prototype": ["join"]
};

// Methods whose answer for a string outside ASCII follows the engine's Unicode
// version, which the printer folds on ASCII strings only.
const UNICODE_DEPENDENT_METHODS = [
	"normalize",
	"toLowerCase",
	"toUpperCase",
	"trim",
	"trimEnd",
	"trimStart"
];

// String methods whose count or length argument sets their result's size,
// which the printer refuses past the call's own size before running them.
const SIZED_BY_ARGUMENT_METHODS = ["padEnd", "padStart", "repeat"];

// Every other member @mdn/browser-compat-data lists of `Math`, `Number`,
// `String`, `Array` and the global functions, by why it is not folded; one it
// starts listing fails generation until it is placed here or above.
const UNFOLDED_BUILT_INS = {
	"it is a value or a syntax feature, not a function": [
		"globalThis",
		"undefined",
		"Math.E",
		"Math.LN10",
		"Math.LN2",
		"Math.LOG10E",
		"Math.LOG2E",
		"Math.PI",
		"Math.SQRT1_2",
		"Math.SQRT2",
		"Number.EPSILON",
		"Number.MAX_SAFE_INTEGER",
		"Number.MAX_VALUE",
		"Number.MIN_SAFE_INTEGER",
		"Number.MIN_VALUE",
		"Number.NEGATIVE_INFINITY",
		"Number.NaN",
		"Number.POSITIVE_INFINITY",
		"String.prototype.length",
		"String.unicode_code_point_escapes",
		"Array.prototype.length",
		"Array.@@species",
		"Array.prototype.@@unscopables"
	],
	"it runs code, or answers differently on each call": ["eval", "Math.random"],
	"the spec lets each engine approximate its answer": [
		"Math.acos",
		"Math.acosh",
		"Math.asin",
		"Math.asinh",
		"Math.atan",
		"Math.atan2",
		"Math.atanh",
		"Math.cbrt",
		"Math.cos",
		"Math.cosh",
		"Math.exp",
		"Math.expm1",
		"Math.hypot",
		"Math.log",
		"Math.log10",
		"Math.log1p",
		"Math.log2",
		"Math.pow",
		"Math.sin",
		"Math.sinh",
		"Math.tan",
		"Math.tanh"
	],
	"its answer reads the host's locale": [
		"Number.prototype.toLocaleString",
		"String.prototype.localeCompare",
		"String.prototype.toLocaleLowerCase",
		"String.prototype.toLocaleUpperCase",
		"Array.prototype.toLocaleString"
	],
	"the oldest Node webpack builds on lacks it, so folding it would tie the output to the build's Node":
		[
			"Math.f16round",
			"Math.sumPrecise",
			"String.prototype.at",
			"String.prototype.isWellFormed",
			"String.prototype.replaceAll",
			"String.prototype.toWellFormed"
		],
	"it answers an object, which no literal the printer writes stands for": [
		"String.prototype.@@iterator",
		"String.prototype.match",
		"String.prototype.matchAll",
		"Array.prototype.@@iterator",
		"Array.prototype.entries",
		"Array.prototype.keys",
		"Array.prototype.values"
	],
	"it answers an array, which gzips worse as a literal than the call": [
		"String.prototype.split"
	],
	"the printer evaluates calls on string and array literals only": [
		"Number.prototype.toExponential",
		"Number.prototype.toFixed",
		"Number.prototype.toPrecision",
		"Number.prototype.toString",
		"Number.prototype.valueOf"
	],
	"rarely called on literals, so not weighed yet": [
		"escape",
		"unescape",
		"Number.Number",
		"String.String",
		"String.raw",
		"String.prototype.anchor",
		"String.prototype.big",
		"String.prototype.blink",
		"String.prototype.bold",
		"String.prototype.fixed",
		"String.prototype.fontcolor",
		"String.prototype.fontsize",
		"String.prototype.italics",
		"String.prototype.link",
		"String.prototype.search",
		"String.prototype.small",
		"String.prototype.strike",
		"String.prototype.sub",
		"String.prototype.sup",
		"String.prototype.toString",
		"String.prototype.trimLeft",
		"String.prototype.trimRight",
		"String.prototype.valueOf",
		"Array.Array",
		"Array.from",
		"Array.fromAsync",
		"Array.isArray",
		"Array.of",
		"Array.prototype.at",
		"Array.prototype.concat",
		"Array.prototype.copyWithin",
		"Array.prototype.every",
		"Array.prototype.fill",
		"Array.prototype.filter",
		"Array.prototype.find",
		"Array.prototype.findIndex",
		"Array.prototype.findLast",
		"Array.prototype.findLastIndex",
		"Array.prototype.flat",
		"Array.prototype.flatMap",
		"Array.prototype.forEach",
		"Array.prototype.includes",
		"Array.prototype.indexOf",
		"Array.prototype.lastIndexOf",
		"Array.prototype.map",
		"Array.prototype.pop",
		"Array.prototype.push",
		"Array.prototype.reduce",
		"Array.prototype.reduceRight",
		"Array.prototype.reverse",
		"Array.prototype.shift",
		"Array.prototype.slice",
		"Array.prototype.some",
		"Array.prototype.sort",
		"Array.prototype.splice",
		"Array.prototype.toReversed",
		"Array.prototype.toSorted",
		"Array.prototype.toSpliced",
		"Array.prototype.toString",
		"Array.prototype.unshift",
		"Array.prototype.with"
	]
};

/**
 * The compat entry of every member BCD lists of an owner the printer folds
 * on, by its name as the tables above spell it.
 * @returns {Map<string, BcdCompat>} the entries
 */
const collectBuiltInMembers = () => {
	const builtins = bcd.javascript.builtins;
	/** @type {Map<string, BcdCompat>} */
	const members = new Map();
	for (const key of Object.keys(builtins)) {
		if (/^[a-z]/.test(key)) members.set(key, builtins[key].__compat);
	}
	for (const owner of ["Math", "Number", "String", "Array"]) {
		for (const key of Object.keys(builtins[owner])) {
			if (key === "__compat") continue;
			const compat = builtins[owner][key].__compat;
			const spec = String(compat.spec_url);
			// The anchor names the prototype for a method or an instance property.
			const onPrototype = /\.prototype[.-]|-instances-/i.test(spec);
			members.set(`${owner}.${onPrototype ? "prototype." : ""}${key}`, compat);
		}
	}
	return members;
};

/**
 * The oldest Node version webpack supports, from its `engines` field.
 * @returns {number[]} major, minor and patch
 */
const oldestSupportedNode = () =>
	/** @type {string} */ (
		/** @type {RegExpMatchArray} */ (
			require("../package.json").engines.node.match(/\d+\.\d+\.\d+/)
		)[0]
	)
		.split(".")
		.map(Number);

/**
 * Whether one dotted version comes no later than another.
 * @param {string} version a version as BCD writes it
 * @param {number[]} limit major, minor and patch
 * @returns {boolean} true when it does
 */
const isNoLaterThan = (version, limit) => {
	const parts = version.split(".").map(Number);
	for (let i = 0; i < limit.length; i++) {
		const part = parts[i] || 0;
		if (part !== limit[i]) return part < limit[i];
	}
	return true;
};

/**
 * The built-ins `improve` folds, checked against BCD: each one present, on the
 * owner it is spelled under, and in every Node webpack builds on.
 * @returns {{ globals: string[], statics: Record<string, string[]>, methods: Record<string, string[]>, unicodeDependent: string[], sizedByArgument: string[] }} the tables
 */
const collectFoldedBuiltIns = () => {
	const members = collectBuiltInMembers();
	const oldestNode = oldestSupportedNode();
	/** @type {Map<string, string>} */
	const placed = new Map();
	/**
	 * @param {string} name a member's name
	 * @param {string} place where the tables put it
	 */
	const place = (name, place) => {
		if (!members.has(name)) {
			throw new Error(
				`@mdn/browser-compat-data lists no built-in ${name}, which ${place} names`
			);
		}
		if (placed.has(name)) {
			throw new Error(`${name} is both ${placed.get(name)} and ${place}`);
		}
		placed.set(name, place);
	};
	/** @type {string[]} */
	const globals = [];
	/** @type {Record<string, string[]>} */
	const statics = {};
	/** @type {Record<string, string[]>} */
	const methods = {};
	for (const [owner, names] of Object.entries(FOLDED_BUILT_INS)) {
		for (const name of names) {
			const qualified = owner === "global" ? name : `${owner}.${name}`;
			place(qualified, "FOLDED_BUILT_INS");
			const support = /** @type {BcdCompat} */ (members.get(qualified)).support
				.nodejs;
			const added = (Array.isArray(support) ? support[0] : support)
				.version_added;
			if (typeof added !== "string" || !isNoLaterThan(added, oldestNode)) {
				throw new Error(
					`${qualified} is in Node from ${added} only, after the oldest Node webpack builds on, so folding it would tie the output to the build's Node`
				);
			}
		}
		if (owner === "global") {
			globals.push(...names);
		} else if (owner.endsWith(".prototype")) {
			methods[owner.slice(0, -".prototype".length)] = names;
		} else {
			statics[owner] = names;
		}
	}
	for (const [reason, names] of Object.entries(UNFOLDED_BUILT_INS)) {
		for (const name of names) place(name, `left out as "${reason}"`);
	}
	const unplaced = [...members.keys()].filter((name) => !placed.has(name));
	if (unplaced.length > 0) {
		throw new Error(
			`Place each built-in @mdn/browser-compat-data now lists in FOLDED_BUILT_INS or UNFOLDED_BUILT_INS in tooling/generate-js-data.js: ${unplaced.join(
				", "
			)}`
		);
	}
	for (const name of [
		...UNICODE_DEPENDENT_METHODS,
		...SIZED_BY_ARGUMENT_METHODS
	]) {
		if (!FOLDED_BUILT_INS["String.prototype"].includes(name)) {
			throw new Error(`${name} is not a folded string method`);
		}
	}
	return {
		globals,
		statics,
		methods,
		unicodeDependent: UNICODE_DEPENDENT_METHODS,
		sizedByArgument: SIZED_BY_ARGUMENT_METHODS
	};
};

/**
 * The built-ins `improve` folds, as a section of the printer's data module.
 * @returns {string} its source
 */
const renderFoldedBuiltIns = () => `
/**
 * @typedef {object} FoldedBuiltIns
 * @property {string[]} globals the global functions
 * @property {Record<string, string[]>} statics the functions of each global object
 * @property {Record<string, string[]>} methods the prototype methods of each constructor
 * @property {string[]} unicodeDependent the string methods folded on ASCII only
 * @property {string[]} sizedByArgument the string methods a count or length argument sizes
 */

// The built-ins the \`improve\` phase evaluates on literals, by owner, as
// tooling/generate-js-data.js checks them against @mdn/browser-compat-data.
/**
 * @returns {FoldedBuiltIns} the tables, fresh on each call
 */
const foldedBuiltIns = () => (${JSON.stringify(collectFoldedBuiltIns())});
`;

// Built-ins whose call `improve` never drops, even on literal arguments, by why.
const IMPURE_BUILT_INS = {
	"it runs code given as a string": ["eval", "Function"],
	"it may answer a rejected promise, which an unhandled-rejection handler observes":
		["Promise.all", "Promise.any", "Promise.race", "Promise.reject"],
	"it blocks or wakes another agent": [
		"Atomics.wait",
		"Atomics.notify",
		"Atomics.waitAsync"
	]
};

// Built-in globals `improve` neither reads nor calls away, by why.
const UNREAD_BUILT_INS = {
	"its answers follow the host's locale and ICU data": ["Intl"],
	"browsers leave it undefined outside cross-origin isolated pages": [
		"SharedArrayBuffer"
	]
};

/**
 * Whether BCD says a feature is in every Node webpack builds on.
 * @param {BcdCompat} compat the feature's compat entry
 * @param {number[]} oldestNode major, minor and patch
 * @returns {boolean} true when it is
 */
const isInOldestNode = (compat, oldestNode) => {
	const support = compat.support.nodejs;
	if (!support) return false;
	const added = (Array.isArray(support) ? support[0] : support).version_added;
	return (
		typeof added === "string" &&
		isNoLaterThan(added.replace(/^≤/, ""), oldestNode)
	);
};

/**
 * The built-ins `improve` drops when nothing reads what they answer: the
 * globals it may read, those it may call, and each one's static members.
 * @returns {{ globals: string[], callableGlobals: string[], statics: Record<string, string[]> }} the tables
 */
const collectPureBuiltIns = () => {
	const builtins = bcd.javascript.builtins;
	const oldestNode = oldestSupportedNode();
	/** @type {Set<string>} */
	const unread = new Set();
	for (const names of Object.values(UNREAD_BUILT_INS)) {
		for (const name of names) {
			if (!builtins[name]) {
				throw new Error(`@mdn/browser-compat-data lists no built-in ${name}`);
			}
			unread.add(name);
		}
	}
	/** @type {Set<string>} */
	const impure = new Set();
	for (const names of Object.values(IMPURE_BUILT_INS)) {
		for (const name of names) {
			const [owner, member] = name.split(".");
			if (!builtins[owner] || (member && !builtins[owner][member])) {
				throw new Error(`@mdn/browser-compat-data lists no built-in ${name}`);
			}
			impure.add(name);
		}
	}
	/** @type {string[]} */
	const globals = [];
	/** @type {Record<string, string[]>} */
	const statics = {};
	for (const name of Object.keys(builtins).sort()) {
		const entry = builtins[name];
		// A constructor's own entry dates the global; a namespace's dates itself.
		const compat = (entry[name] || entry).__compat;
		if (
			unread.has(name) ||
			!isInOldestNode(compat, oldestNode) ||
			!Object.prototype.hasOwnProperty.call(global, name)
		) {
			continue;
		}
		globals.push(name);
		if (!/^[A-Z]/.test(name)) continue;
		/** @type {string[]} */
		const members = [];
		for (const key of Object.keys(entry).sort()) {
			// BCD names a syntax feature in snake case, as `json_superset`.
			if (
				key === "__compat" ||
				key === name ||
				!/^[a-z]\w*$/i.test(key) ||
				/^[a-z]+_[a-z_]+$/.test(key)
			) {
				continue;
			}
			const memberCompat = entry[key].__compat;
			// A feature BCD tracks without a page of its own is no member.
			if (
				!memberCompat ||
				!memberCompat.mdn_url ||
				!memberCompat.status ||
				!memberCompat.status.standard_track
			) {
				continue;
			}
			const spec = String(memberCompat.spec_url);
			if (!spec.startsWith("https://tc39.es/ecma262/")) continue;
			if (/\.prototype[.-]|-instances-/i.test(spec)) continue;
			if (impure.has(`${name}.${key}`)) continue;
			if (isInOldestNode(memberCompat, oldestNode)) members.push(key);
		}
		if (members.length > 0) statics[name] = members;
	}
	return {
		globals,
		callableGlobals: globals.filter((name) => !impure.has(name)),
		statics
	};
};

/**
 * The built-ins `improve` drops, as a section of the printer's data module.
 * @returns {string} its source
 */
const renderPureBuiltIns = () => `
/**
 * @typedef {object} PureBuiltIns
 * @property {string[]} globals the globals a read of which has no effect
 * @property {string[]} callableGlobals the globals a call of which on literals has none but a throw
 * @property {Record<string, string[]>} statics the functions of each global a call of which on literals has none but a throw
 */

// The built-ins the \`improve\` phase drops where nothing reads them, each in
// every Node webpack builds on, as @mdn/browser-compat-data lists them.
/**
 * @returns {PureBuiltIns} the tables, fresh on each call
 */
const pureBuiltIns = () => (${JSON.stringify(collectPureBuiltIns())});
`;

/**
 * terser's parser tables, as a section of the data module.
 * @returns {string} its source
 */
const renderParserTables = () => `
// terser's tables the printer names tokens by, read out of its \`parse.js\`:
// each a list of words, and \`PRECEDENCE\` the operators of each level, loosest
// first.
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
 * @param {string} sources the packages its tables are read from, with versions
 * @returns {string} its source
 */
const renderHeader = (sources) => `/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

// GENERATED by tooling/generate-js-data.js — do not edit.
// Sources: ${sources}. The tables read from terser are under its
// license, quoted in full in syntax-printer.js.

"use strict";
`;

const TERSER_SOURCE = `terser ${require("terser/package.json").version}`;

/**
 * Build the module the parser classifies with: the identifier ranges the
 * tokenizer reads and the property names `\\p{...}` accepts.
 * @returns {string} its source
 */
const renderData = () => {
	const tables = collectIdentifierTables();
	const narrow = collectNarrowIdentifierTables();
	return `${renderHeader(`acorn ${acorn.version}, ${TERSER_SOURCE}`)}
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
${renderUnicodeProperties()}
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
`;
};

/**
 * Build the module only the printer reads, so a build that parses without
 * minifying through it never loads these tables.
 * @returns {string} its source
 */
const renderPrinterData = () => `${renderHeader(
	`${TERSER_SOURCE}, @mdn/browser-compat-data ${bcd.__meta.version}`
)}${renderNativeObjects()}${renderParserTables()}${renderDomProperties()}${renderFoldedBuiltIns()}${renderPureBuiltIns()}
module.exports.domProperties = domProperties;
module.exports.foldedBuiltIns = foldedBuiltIns;
module.exports.pureBuiltIns = pureBuiltIns;
module.exports.nativeObjectTables = nativeObjectTables;
module.exports.parserTables = parserTables;
`;

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

	// Loaded here, not at the top: tests read this module's tables, and Bun's
	// worker threads exit when they load prettier.
	const prettier = require("prettier");

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
	await writeGenerated(PRINTER_DATA_TARGET, renderPrinterData());
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
module.exports.PRINTER_DATA_TARGET = PRINTER_DATA_TARGET;
module.exports.collectDomProperties = collectDomProperties;
module.exports.collectIdentifierTables = collectIdentifierTables;
module.exports.collectNarrowIdentifierTables = collectNarrowIdentifierTables;
module.exports.collectNativeObjects = collectNativeObjects;
module.exports.collectParserTables = collectParserTables;
module.exports.collectUnicodeProperties = collectUnicodeProperties;
module.exports.encodeRanges = encodeRanges;
