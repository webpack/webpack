/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// cspell:ignore DEFNODE, PUNC, argnames, bcatch, bfinally, argname, thedef, Defun, Funarg, funarg

const fs = require("fs");
const path = require("path");
const bcd =
	/** @type {{ javascript: { builtins: { [name: string]: { __compat: BcdCompat } & BcdMembers } }, api: { Window: BcdMembers }, __meta: { version: string } }} */ (
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
const PARSE_ERROR_CODES_TARGET = path.resolve(
	__dirname,
	"../lib/javascript/parse-error-codes.js"
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
	"Number.prototype": [
		"toExponential",
		"toFixed",
		"toPrecision",
		"toString",
		"valueOf"
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
	Array: ["of"],
	"Array.prototype": ["concat", "join"]
};

// Static values `improve` writes as the number they hold where that is shorter.
const FOLDED_CONSTANTS = {
	Number: ["NEGATIVE_INFINITY", "NaN", "POSITIVE_INFINITY"]
};

// Static values `improve` writes as a power of two, as `2**53-1`, from
// ECMAScript 2016: their digits are longer, or gzip worse, than their name.
const POWER_OF_TWO_CONSTANTS = {
	Number: ["EPSILON", "MAX_SAFE_INTEGER", "MIN_SAFE_INTEGER"]
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

// Constructors the spec has construct the same called without `new`, which
// `improve` calls so; `RegExp` only where it is passed no regular expression.
const CONSTRUCTED_WHEN_CALLED = [
	"AggregateError",
	"Array",
	"Error",
	"EvalError",
	"Function",
	"Object",
	"RangeError",
	"ReferenceError",
	"RegExp",
	"SyntaxError",
	"TypeError",
	"URIError"
];

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
		"Number.MAX_VALUE",
		"Number.MIN_VALUE",
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
		"Array.prototype.at",
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
	/** @type {RegExpMatchArray} */ (
		require("../package.json").engines.node.match(/\d+\.\d+\.\d+/)
	)[0]
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
 * @returns {{ globals: string[], statics: Record<string, string[]>, methods: Record<string, string[]>, constants: Record<string, string[]>, powerOfTwoConstants: Record<string, string[]>, unicodeDependent: string[], sizedByArgument: string[], constructedWhenCalled: string[] }} the tables
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
	for (const [owner, names] of Object.entries(FOLDED_CONSTANTS)) {
		for (const name of names) place(`${owner}.${name}`, "FOLDED_CONSTANTS");
	}
	for (const [owner, names] of Object.entries(POWER_OF_TWO_CONSTANTS)) {
		for (const name of names) {
			place(`${owner}.${name}`, "POWER_OF_TWO_CONSTANTS");
			// The printer writes 2**k, 2**k-1 or 1-2**k, k its magnitude's log rounded.
			const value = /** @type {EXPECTED_ANY} */ (global)[owner][name];
			const power = 2 ** Math.round(Math.log2(Math.abs(value)));
			if (![power, power - 1, 1 - power].includes(value)) {
				throw new Error(`${owner}.${name} is no power of two, nor one off it`);
			}
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
	for (const name of CONSTRUCTED_WHEN_CALLED) {
		if (!bcd.javascript.builtins[name]) {
			throw new Error(`@mdn/browser-compat-data lists no built-in ${name}`);
		}
	}
	return {
		globals,
		statics,
		methods,
		constants: FOLDED_CONSTANTS,
		powerOfTwoConstants: POWER_OF_TWO_CONSTANTS,
		unicodeDependent: UNICODE_DEPENDENT_METHODS,
		sizedByArgument: SIZED_BY_ARGUMENT_METHODS,
		constructedWhenCalled: CONSTRUCTED_WHEN_CALLED
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
 * @property {Record<string, string[]>} constants the static values of each global object
 * @property {Record<string, string[]>} powerOfTwoConstants the static values of each global object written as a power of two
 * @property {string[]} unicodeDependent the string methods folded on ASCII only
 * @property {string[]} sizedByArgument the string methods a count or length argument sizes
 * @property {string[]} constructedWhenCalled the constructors that construct the same without \`new\`
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
	],
	"running it at build time keeps its key in the build's own symbol registry": [
		"Symbol.for"
	]
};

// Built-in globals `improve` neither reads nor calls away, by why.
const UNREAD_BUILT_INS = {
	"its answers follow the host's locale and ICU data": ["Intl"],
	"browsers leave it undefined outside cross-origin isolated pages": [
		"SharedArrayBuffer"
	]
};

// The globals a browser page defines whose read `improve` takes to have no
// effect, as swc and oxc do; each a property of `Window`, as BCD lists it. A
// storage, whose read throws where a page may not use it, is left out.
const HOST_GLOBALS = [
	"document",
	"frames",
	"history",
	"location",
	"navigator",
	"parent",
	"screen",
	"self",
	"top",
	"window"
];

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
 * @returns {{ globals: string[], callableGlobals: string[], statics: Record<string, string[]>, hostGlobals: string[], knownMembers: Record<string, string[]> }} the tables
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
	/**
	 * @param {string} name a built-in BCD lists
	 * @returns {string[]} its static members the oldest Node webpack builds on has
	 */
	const staticMembers = (name) => {
		const entry = builtins[name];
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
		return members;
	};
	// BCD lists `of` and `from` once, on `%TypedArray%`, which each typed array inherits.
	const typedArrayStatics = staticMembers("TypedArray");
	const TypedArray = Object.getPrototypeOf(Int8Array);
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
		const members = staticMembers(name);
		if (
			Object.getPrototypeOf(/** @type {EXPECTED_ANY} */ (global)[name]) ===
			TypedArray
		) {
			for (const member of typedArrayStatics) {
				if (!members.includes(member)) members.push(member);
			}
			members.sort();
		}
		if (members.length > 0) statics[name] = members;
	}
	for (const name of HOST_GLOBALS) {
		const compat = bcd.api.Window[name] && bcd.api.Window[name].__compat;
		if (!compat || !compat.status || !compat.status.standard_track) {
			throw new Error(
				`@mdn/browser-compat-data lists no standard Window property ${name}`
			);
		}
	}
	// Every member BCD knows on each, whichever edition added it, so a key the
	// build's Node lacks yet the target's has is never read as missing.
	/** @type {Record<string, string[]>} */
	const knownMembers = {};
	for (const owner of ["Array", "Object", "String"]) {
		knownMembers[owner] = Object.keys(builtins[owner])
			.filter(
				(key) =>
					key !== "__compat" && key !== owner && /^[a-z$_][\w$]*$/i.test(key)
			)
			.sort();
	}
	return {
		globals,
		callableGlobals: globals.filter((name) => !impure.has(name)),
		statics,
		hostGlobals: HOST_GLOBALS,
		knownMembers
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
 * @property {string[]} hostGlobals the globals a browser page defines, a read of which is taken to have no effect
 * @property {Record<string, string[]>} knownMembers every member any edition gives \`Array\`, \`Object\` and \`String\` or their prototypes
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
// Sources: ${sources}.${
	sources.includes("terser")
		? ` The tables read from terser are under its
// license, quoted in full in syntax-printer.js.`
		: ""
}

"use strict";
`;

const TERSER_SOURCE = `terser ${require("terser/package.json").version}`;

const FUNCTION_FIELDS =
	"id:node expression:flag generator:flag async:flag params:list body:node";
const CLASS_FIELDS = "id:node superClass:node body:node";

// Each node type the parser makes, its fields as `name:kind` in the order its
// objects hold them: a child `node`, a `list` of them, a `string`, a `flag`, a
// literal's `value`, or a string an `optional` node lacks while unset.
/** @type {Record<string, string>} */
const NODE_TYPES = {
	Identifier: "name:string",
	PrivateIdentifier: "name:string",
	Literal: "value:value raw:string",
	MemberExpression: "object:node property:node computed:flag optional:flag",
	CallExpression: "callee:node arguments:list optional:flag",
	NewExpression: "callee:node arguments:list",
	ExpressionStatement: "expression:node directive:optional",
	VariableDeclarator: "id:node init:node",
	VariableDeclaration: "declarations:list kind:string",
	Property:
		"method:flag shorthand:flag computed:flag key:node value:node kind:string",
	BinaryExpression: "left:node operator:string right:node",
	LogicalExpression: "left:node operator:string right:node",
	AssignmentExpression: "operator:string left:node right:node",
	AssignmentPattern: "left:node right:node",
	BlockStatement: "body:list",
	StaticBlock: "body:list",
	ClassBody: "body:list",
	Program: "body:list sourceType:string",
	ReturnStatement: "argument:node",
	ThrowStatement: "argument:node",
	AwaitExpression: "argument:node",
	SpreadElement: "argument:node",
	RestElement: "argument:node",
	YieldExpression: "delegate:flag argument:node",
	UnaryExpression: "operator:string prefix:flag argument:node",
	UpdateExpression: "operator:string prefix:flag argument:node",
	ArrayExpression: "elements:list",
	ArrayPattern: "elements:list",
	ObjectExpression: "properties:list",
	ObjectPattern: "properties:list",
	ThisExpression: "",
	Super: "",
	EmptyStatement: "",
	DebuggerStatement: "",
	FunctionExpression: FUNCTION_FIELDS,
	FunctionDeclaration: FUNCTION_FIELDS,
	ArrowFunctionExpression: FUNCTION_FIELDS,
	IfStatement: "test:node consequent:node alternate:node",
	ConditionalExpression: "test:node consequent:node alternate:node",
	ParenthesizedExpression: "expression:node",
	PropertyDefinition: "static:flag computed:flag key:node value:node",
	MethodDefinition: "static:flag computed:flag key:node kind:string value:node",
	TemplateElement: "value:value tail:flag",
	TemplateLiteral: "expressions:list quasis:list",
	TaggedTemplateExpression: "tag:node quasi:node",
	SequenceExpression: "expressions:list",
	SwitchCase: "consequent:list test:node",
	SwitchStatement: "discriminant:node cases:list",
	ForStatement: "init:node test:node update:node body:node",
	ForInStatement: "left:node right:node body:node",
	ForOfStatement: "await:flag left:node right:node body:node",
	WhileStatement: "test:node body:node",
	DoWhileStatement: "body:node test:node",
	WithStatement: "object:node body:node",
	LabeledStatement: "body:node label:node",
	BreakStatement: "label:node",
	ContinueStatement: "label:node",
	TryStatement: "block:node handler:node finalizer:node",
	CatchClause: "param:node body:node",
	ClassDeclaration: CLASS_FIELDS,
	ClassExpression: CLASS_FIELDS,
	ChainExpression: "expression:node",
	ImportDeclaration:
		"specifiers:list source:node attributes:list phase:optional",
	ImportSpecifier: "imported:node local:node",
	ImportDefaultSpecifier: "local:node",
	ImportNamespaceSpecifier: "local:node",
	ImportAttribute: "key:node value:node",
	ImportExpression: "source:node options:node phase:optional",
	ExportNamedDeclaration:
		"declaration:node specifiers:list source:node attributes:list",
	ExportDefaultDeclaration: "declaration:node",
	ExportAllDeclaration: "exported:node source:node attributes:list",
	ExportSpecifier: "local:node exported:node",
	MetaProperty: "meta:node property:node"
};

// WHY: the parser turns an expression into a pattern in place (`toAssignable`),
// so a pattern's slots must be a prefix of its expression's: an assignment's
// operator goes last, after the `left` and `right` an `AssignmentPattern` keeps.
/** @type {Record<string, string[]>} */
const SLOT_ORDERS = {
	AssignmentExpression: ["left", "right", "operator"]
};

/**
 * The numbering the tree and its path read nodes by, as CSS and HTML number
 * theirs: node types and fields from 1, flags as bits, and texts from 1.
 * @returns {{ types: Record<string, number>, fields: Record<string, number>, flags: Record<string, number>, parts: Record<string, number> }} each table by member name
 */
const collectNodeTables = () => {
	/** @type {Record<string, number>} */
	const types = {};
	/** @type {Record<string, number>} */
	const fields = {};
	/** @type {Record<string, number>} */
	const flags = {};
	/** @type {Record<string, number>} */
	const parts = {};
	let flagCount = 0;
	for (const name of Object.keys(NODE_TYPES)) {
		types[name] = Object.keys(types).length + 1;
		for (const part of NODE_TYPES[name].split(" ").filter(Boolean)) {
			const [field, kind] = part.split(":");
			if (kind === "node" || kind === "list") {
				if (!(field in fields)) fields[field] = Object.keys(fields).length + 1;
			} else if (kind === "flag") {
				if (!(field in flags)) flags[field] = 1 << flagCount++;
			} else if (kind !== "value" && field !== "name" && !(field in parts)) {
				parts[field] = Object.keys(parts).length + 1;
			}
		}
	}
	return { types, fields, flags, parts };
};

/**
 * Each node type's fields as `name:kind:slot`, in the order its objects hold
 * them; a flag's slot is its `Flag` bit, any other field's its place in the record.
 * @returns {Record<string, string>} the fields by node type
 */
const collectNodeFields = () => {
	const { flags } = collectNodeTables();
	/** @type {Record<string, string>} */
	const result = {};
	for (const name of Object.keys(NODE_TYPES)) {
		const fields = NODE_TYPES[name]
			.split(" ")
			.filter(Boolean)
			.map((part) => {
				const [field, kind] = part.split(":");
				return { field, kind, slot: 0 };
			});
		const slotted = fields.filter((field) => field.kind !== "flag");
		const order = SLOT_ORDERS[name];
		if (order !== undefined) {
			slotted.sort((a, b) => order.indexOf(a.field) - order.indexOf(b.field));
		}
		for (let i = 0; i < slotted.length; i++) slotted[i].slot = i;
		for (const field of fields) {
			if (field.kind === "flag") field.slot = flags[field.field];
		}
		result[name] = fields
			.map(({ field, kind, slot }) => `${field}:${kind}:${slot}`)
			.join(" ");
	}
	return result;
};

/**
 * One generated table as a constant whose JSDoc types each member literally,
 * so `types.d.ts` reads `NodeType.Identifier` as `1`.
 * @param {string} name the constant's name
 * @param {string} description its comment
 * @param {Record<string, number>} table the table
 * @returns {string} its source
 */
const renderNumberTable = (name, description, table) => {
	const entries = Object.keys(table).map((key) => `${key}: ${table[key]}`);
	return `// ${description}\n/** @type {Readonly<{ ${entries.join(", ")} }>} */\nconst ${name} = {\n${entries.join(",\n")}\n};\n`;
};

// Babel names its parse errors, ECMA-262 and acorn do not, so a parse error's
// code is Babel's `reasonCode` for the same error, kebab-cased.
const BABEL_PARSER = require.resolve("@babel/parser", {
	paths: [require.resolve("@babel/core")]
});

/**
 * One parse error message, `*` standing for its variable parts. A `probe` is
 * read by both parsers to take Babel's code; one no option reaches names it.
 * @typedef {object} ParseErrorEntry
 * @property {string} template the message, `*` matching any text
 * @property {string=} probe source raising it, read with Babel too
 * @property {"script" | "module"=} sourceType what the probe is read as
 * @property {boolean=} importPhases whether the probe needs import phases
 * @property {string=} babel Babel's code, where no probe reaches the message
 * @property {string=} own a code of webpack's own, where Babel has none
 */

// cspell:ignore rget
/** @type {ParseErrorEntry[]} */
const PARSE_ERRORS = [
	{
		template:
			"'import defer' can only be used with namespace imports ('import defer * as identifierName from ...').",
		probe: 'import defer a from "x"',
		sourceType: "module",
		importPhases: true
	},
	{
		template:
			"'import source' can only be used with direct identifier specifier imports ('import source identifierName from ...').",
		babel: "SourcePhaseImportRequiresDefault"
	},
	{
		template:
			"'import source' can only be used with direct identifier specifier imports.",
		probe: 'import source {a} from "x"',
		sourceType: "module",
		importPhases: true
	},
	{
		template: "'import' and 'export' may appear only with 'sourceType: module'",
		probe: "import a from 'x'",
		sourceType: "script"
	},
	{
		template: "'import' and 'export' may only appear at the top level",
		probe: "{ import a from 'x' }",
		sourceType: "module"
	},
	{
		template: "'import.*' can only be used in a dynamic import.",
		probe: "import.source",
		sourceType: "module",
		importPhases: true
	},
	{
		template: "'import.*' must not contain escaped characters",
		probe: "import.m\\u0065ta",
		sourceType: "module"
	},
	{
		template:
			"'new.target' can only be used in functions and class static block",
		probe: "new.target",
		sourceType: "script"
	},
	{
		template: "'new.target' must not contain escaped characters",
		probe: "function f(){ new.t\\u0061rget }",
		sourceType: "script"
	},
	{
		template: "'return' outside of function",
		probe: "return 1",
		sourceType: "script"
	},
	{
		template: "'super' keyword outside a method",
		probe: "super.x",
		sourceType: "script"
	},
	{
		template: "'with' in strict mode",
		probe: "'use strict'; with (a) {}",
		sourceType: "script"
	},
	{
		template: "* loop variable declaration may not have an initializer",
		probe: "for (var a = 1 of b);",
		sourceType: "script"
	},
	{
		template:
			"A string literal cannot be used as an exported binding without `from`.",
		probe: "export { 'a' }",
		sourceType: "module"
	},
	{
		template: "An export name cannot include a lone surrogate.",
		probe: "export { a as '\\uD800' }; var a",
		sourceType: "module"
	},
	{
		template: "Argument name clash",
		probe: "function f(a, a) { 'use strict' }",
		sourceType: "script"
	},
	{
		template: "Assigning to * in strict mode",
		probe: "'use strict'; eval = 1",
		sourceType: "script"
	},
	{
		template: "Binding * in strict mode",
		probe: "'use strict'; function eval() {}",
		sourceType: "script"
	},
	{ template: "Assigning to rvalue", probe: "1 = 2", sourceType: "script" },
	{ template: "Binding rvalue", babel: "InvalidLhsBinding" },
	{
		template: "Await expression cannot be a default value",
		probe: "async function f(a = await 1) {}",
		sourceType: "module"
	},
	{
		template: "Await using cannot appear outside of async function",
		probe: "function f() { await using x = y }",
		sourceType: "module"
	},
	{
		template: "Bad character escape sequence",
		probe: "a\\u0",
		sourceType: "script"
	},
	{
		template: "Bad escape sequence in untagged template literal",
		probe: "`\\u{`",
		sourceType: "script"
	},
	{
		template: "Binding member expression",
		babel: "InvalidPropertyBindingPattern"
	},
	{
		template: "Binding parenthesized expression",
		babel: "InvalidParenthesizedAssignment"
	},
	{
		template: "Parenthesized pattern",
		probe: "((a)) => 1",
		sourceType: "script"
	},
	{
		template: "Cannot use 'arguments' in class field initializer",
		probe: "class A { x = arguments }",
		sourceType: "script"
	},
	{
		template: "Cannot use 'await' as identifier inside an async function",
		probe: "async function f() { var await }",
		sourceType: "script"
	},
	{
		template: "Cannot use 'import.meta' outside a module",
		probe: "import.meta",
		sourceType: "script"
	},
	{
		template: "Cannot use 'yield' as identifier inside a generator",
		probe: "function* f() { var yield }",
		sourceType: "script"
	},
	{
		template: "Cannot use * in class static initialization block",
		probe: "class A { static { arguments } }",
		sourceType: "script"
	},
	{
		template: "Cannot use keyword 'await' outside an async function",
		probe: "function f() { await x }",
		sourceType: "module"
	},
	{
		template: "Classes can't have a field named 'constructor'",
		probe: "class A { constructor = 1 }",
		sourceType: "script"
	},
	{
		template: "Classes can't have a static field named 'prototype'",
		probe: "class A { static prototype = 1 }",
		sourceType: "script"
	},
	{
		template: "Classes can't have an element named '#constructor'",
		probe: "class A { #constructor }",
		sourceType: "script"
	},
	{
		template: "Classes may not have a static property named prototype",
		probe: "class A { static prototype() {} }",
		sourceType: "script"
	},
	{ template: "Code point out of bounds", babel: "InvalidCodePoint" },
	{
		template: "Comma is not permitted after the rest element",
		probe: "let [...a,] = b",
		sourceType: "script"
	},
	{
		template: "Complex binding patterns require an initialization value",
		probe: "let {a}",
		sourceType: "script"
	},
	{
		template: "Constructor can't be a generator",
		probe: "class A { *constructor() {} }",
		sourceType: "script"
	},
	{
		template: "Constructor can't be an async method",
		probe: "class A { async constructor() {} }",
		sourceType: "script"
	},
	{
		template: "Constructor can't have get/set modifier",
		probe: "class A { get constructor() {} }",
		sourceType: "script"
	},
	{
		template: "Deleting local variable in strict mode",
		probe: "'use strict'; var a; delete a",
		sourceType: "script"
	},
	{
		template: "Duplicate attribute key '*'",
		probe: "import a from 'x' with { type: 'a', type: 'b' }",
		sourceType: "module"
	},
	{
		template: "Duplicate constructor in the same class",
		probe: "class A { constructor() {} constructor() {} }",
		sourceType: "script"
	},
	{
		template: "Duplicate export 'default'",
		probe: "export default 1; export default 2",
		sourceType: "module"
	},
	{
		template: "Duplicate export '*'",
		probe: "export { a }; export { b as a }; var a, b",
		sourceType: "module"
	},
	{
		template: "Duplicate regular expression flag",
		probe: "/a/gg",
		sourceType: "script"
	},
	{
		template: "Escape sequence in keyword *",
		probe: "\\u0069f (a) {}",
		sourceType: "script"
	},
	{
		template: "Expected number in radix *",
		probe: "0b2",
		sourceType: "script"
	},
	{
		template: "Expecting Unicode escape sequence \\uXXXX",
		probe: "\\x",
		sourceType: "script"
	},
	{
		template: "Export '*' is not defined",
		probe: "export { a }",
		sourceType: "module"
	},
	{
		template: "Identifier '#*' has already been declared",
		probe: "class A { #a; #a }",
		sourceType: "script"
	},
	{
		template: "Identifier '*' has already been declared",
		probe: "let a; let a",
		sourceType: "script"
	},
	{
		template: "Identifier directly after number",
		probe: "1a",
		sourceType: "script"
	},
	{
		template:
			"Illegal 'use strict' directive in function with non-simple parameter list",
		probe: "function f(a = 1) { 'use strict' }",
		sourceType: "script"
	},
	{
		template: "Illegal newline after throw",
		probe: "throw\n1",
		sourceType: "script"
	},
	{
		template: "Invalid Unicode escape",
		probe: "\\u0000",
		sourceType: "script"
	},
	{ template: "Invalid escape sequence", probe: "'\\8'", sourceType: "module" },
	{
		template: "Invalid escape sequence in template string",
		babel: "InvalidEscapeSequenceTemplate"
	},
	{
		template: "Octal literal in strict mode",
		probe: "'use strict'; '\\08'",
		sourceType: "script"
	},
	{
		template: "Octal literal in template string",
		babel: "InvalidEscapeSequenceTemplate"
	},
	{ template: "Invalid number", probe: "1e", sourceType: "script" },
	{
		template: "Invalid regular expression flag",
		probe: "/a/x",
		sourceType: "script"
	},
	{
		template: "Invalid regular expression: /*/: *",
		own: "invalid-regular-expression"
	},
	{ template: "Invalid use of 'super'", babel: "UnsupportedSuper" },
	{
		template: "Label '*' is already declared",
		probe: "a: a: 1",
		sourceType: "script"
	},
	{
		template:
			"Logical expressions and coalesce expressions cannot be mixed. Wrap either by parentheses",
		probe: "a ?? b || c",
		sourceType: "script"
	},
	{
		template: "Missing catch or finally clause",
		probe: "try {}",
		sourceType: "script"
	},
	{
		template: "Missing initializer in * declaration",
		probe: "using a",
		sourceType: "module"
	},
	{
		template: "Multiple default clauses",
		probe: "switch (a) { default: default: }",
		sourceType: "script"
	},
	{
		template: "Not enough stack space to parse input",
		own: "not-enough-stack-space"
	},
	{
		template: "Numeric separator is not allowed at the first of digits",
		probe: "0x_1",
		sourceType: "script"
	},
	{
		template: "Numeric separator is not allowed at the last of digits",
		probe: "1_",
		sourceType: "script"
	},
	{
		template:
			"Numeric separator is not allowed in legacy octal numeric literals",
		probe: "0_1",
		sourceType: "script"
	},
	{
		template: "Numeric separator must be exactly one underscore",
		probe: "1__0",
		sourceType: "script"
	},
	{
		template: "Object pattern can't contain getter or setter",
		probe: "({get a(){}} = b)",
		sourceType: "script"
	},
	{
		template: "Only '=' operator can be used for specifying default value.",
		probe: "[a += 1] = b",
		sourceType: "script"
	},
	{
		template: "Optional chaining cannot appear in left-hand side",
		babel: "InvalidLhsOptionalChaining"
	},
	{
		template:
			"Optional chaining cannot appear in the callee of new expressions",
		probe: "new a?.b()",
		sourceType: "script"
	},
	{
		template:
			"Optional chaining cannot appear in the tag of tagged template expressions",
		probe: "a?.b``",
		sourceType: "script"
	},
	{
		template: "Private field '#*' must be declared in an enclosing class",
		probe: "class A { m() { this.#a } }",
		sourceType: "script"
	},
	{
		template: "Private fields can not be deleted",
		probe: "class A { #a; m() { delete this.#a } }",
		sourceType: "script"
	},
	{
		template: "Private identifier can only be left side of binary expression",
		babel: "PrivateInExpectedIn"
	},
	{
		template: "Redefinition of __proto__ property",
		probe: "({__proto__: 1, __proto__: 2})",
		sourceType: "script"
	},
	{ template: "Redefinition of property", own: "redefinition-of-property" },
	{
		template: "Rest elements cannot have a default value",
		probe: "[...a = 1] = b",
		sourceType: "script"
	},
	{
		template: "Setter cannot use rest params",
		probe: "({set a(...b){}})",
		sourceType: "script"
	},
	{
		template:
			"Shorthand property assignments are valid only in destructuring patterns",
		probe: "({a = 1})",
		sourceType: "script"
	},
	{
		template: "The keyword '*' is reserved",
		probe: "'use strict'; var implements",
		sourceType: "script"
	},
	{
		template: "The left-hand side of a for-of loop may not start with 'let'.",
		probe: "for (let.a of b);",
		sourceType: "script"
	},
	{
		template: "The only valid meta property for import is 'import.meta'",
		probe: "import.foo",
		sourceType: "module"
	},
	{
		template: "The only valid meta property for new is 'new.target'",
		probe: "new.foo",
		sourceType: "script"
	},
	{
		template: "Trailing comma is not allowed in import()",
		babel: "ImportCallArity"
	},
	{
		template: "Unexpected character '*'",
		probe: "\u0007",
		sourceType: "script"
	},
	{
		template: "Unexpected keyword '*'",
		probe: "var break",
		sourceType: "script"
	},
	{ template: "Unexpected token", probe: "a ~ ", sourceType: "script" },
	{ template: "Unsyntactic *", probe: "break", sourceType: "script" },
	{ template: "Unterminated comment", probe: "/* x", sourceType: "script" },
	{
		template: "Unterminated regular expression",
		probe: "/a",
		sourceType: "script"
	},
	{
		template: "Unterminated string constant",
		probe: "'a",
		sourceType: "script"
	},
	{ template: "Unterminated template", probe: "`a", sourceType: "script" },
	{
		template: "Unterminated template literal",
		probe: "`${`",
		sourceType: "script"
	},
	{
		template:
			"Using declaration cannot appear in the top level when source type is `script` or in the bare case statement",
		probe: "using x = y",
		sourceType: "script"
	},
	{
		template: "Using declaration is not allowed in for-in loops",
		probe: "for (using x in y);",
		sourceType: "module"
	},
	{
		template: "Using declaration is not allowed in single-statement positions",
		probe: "if (a) using x = y;",
		sourceType: "module"
	},
	{
		template: "Yield expression cannot be a default value",
		probe: "function* g(){ (a = yield) => 1 }",
		sourceType: "module"
	},
	{
		template: "getter should have no params",
		probe: "({get a(b){}})",
		sourceType: "script"
	},
	{
		template: "import call cannot be the target of `new`",
		babel: "ImportCallNotNewExpression"
	},
	{
		template: "let is disallowed as a lexically bound name",
		probe: "let let = 1",
		sourceType: "script"
	},
	{
		template: "setter should have exactly one param",
		probe: "({set a(){}})",
		sourceType: "script"
	},
	{
		template: "super() call outside constructor of a subclass",
		probe: "class A extends B { m() { super() } }",
		sourceType: "script"
	}
];

/**
 * @param {string} template a message, `*` standing for its variable parts
 * @returns {RegExp} what matches every message it stands for
 */
const parseErrorTemplateRegExp = (template) =>
	new RegExp(
		`^${template.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[\\s\\S]*")}$`
	);

/**
 * @param {string} name a Babel `reasonCode`
 * @returns {string} it kebab-cased
 */
const kebabCase = (name) =>
	name
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
		.toLowerCase();

/**
 * Every message the parser raises as a literal, `*` for each interpolation,
 * read off the calls to its raising methods.
 * @returns {Set<string>} the messages
 */
const collectRaisedMessages = () => {
	/** @type {Set<string>} */
	const messages = new Set();
	for (const file of ["syntax-parser.js", "regexp.js"]) {
		const source = fs.readFileSync(
			path.resolve(__dirname, "../lib/javascript", file),
			"utf8"
		);
		const call = /\b(?:raise|raiseRecoverable|invalidStringToken)\(/g;
		for (
			let match = call.exec(source);
			match !== null;
			match = call.exec(source)
		) {
			let depth = 1;
			let end = call.lastIndex;
			while (depth > 0 && end < source.length) {
				const char = source[end];
				if (char === '"' || char === "'" || char === "`") {
					end++;
					while (end < source.length && source[end] !== char) {
						if (source[end] === "\\") end++;
						end++;
					}
				} else if (char === "(") {
					depth++;
				} else if (char === ")") {
					depth--;
				}
				end++;
			}
			const args = source.slice(call.lastIndex, end - 1);
			for (const literal of args.matchAll(
				/`(?:[^`\\]|\\[\s\S])*`|"(?:[^"\\]|\\[\s\S])*"/g
			)) {
				const text = literal[0]
					.slice(1, -1)
					.replace(/\$\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, "*")
					.replace(/\\\\/g, "\\")
					.replace(/\s+/g, " ");
				// Literals naming a node type ride along in casts; a message has a space.
				// The pattern validator's own reach the parser wrapped, as one error.
				if (!text.includes(" ")) continue;
				messages.add(
					file === "regexp.js" && literal.index === args.search(/\S/)
						? `Invalid regular expression: /*/: ${text}`
						: text
				);
			}
		}
	}
	return messages;
};

/**
 * Each parse error message the parser raises paired with its code: Babel's
 * for the same error, read off a probe both parsers reject.
 * @returns {[string, string][]} the templates and their codes, in match order
 */
const collectParseErrorCodes = () => {
	const babel = require(BABEL_PARSER);

	const babelSource = fs.readFileSync(BABEL_PARSER, "utf8");

	const { parse } = require("../lib/javascript/syntax-parser");

	const patterns = PARSE_ERRORS.map((entry) =>
		parseErrorTemplateRegExp(entry.template)
	);
	// A message built from interpolations alone is matched the other way round.
	for (const message of collectRaisedMessages()) {
		const asPattern = parseErrorTemplateRegExp(message.replace(/\*+/g, "*"));
		if (
			!patterns.some((pattern) => pattern.test(message)) &&
			!PARSE_ERRORS.some((entry) => asPattern.test(entry.template))
		) {
			throw new Error(`no PARSE_ERRORS template matches "${message}"`);
		}
	}
	/** @type {[string, string][]} */
	const codes = PARSE_ERRORS.map((entry, index) => {
		if (entry.own !== undefined) return [entry.template, entry.own];
		if (entry.babel !== undefined) {
			if (!new RegExp(`\\n\\s+${entry.babel}:`).test(babelSource)) {
				throw new Error(`Babel names no parse error ${entry.babel}`);
			}
			return [entry.template, kebabCase(entry.babel)];
		}
		const probe = /** @type {string} */ (entry.probe);
		const sourceType = entry.sourceType || "script";
		/** @type {{ message: string, pos: number } | undefined} */
		let raised;
		try {
			parse(probe, {
				ecmaVersion: "latest",
				sourceType,
				importPhases: entry.importPhases === true
			});
		} catch (error) {
			const syntaxError = /** @type {SyntaxError & { pos: number }} */ (error);
			raised = {
				message: syntaxError.message.replace(/ \(\d+:\d+\)$/, ""),
				pos: syntaxError.pos
			};
		}
		const matched =
			raised === undefined
				? -1
				: patterns.findIndex((pattern) => pattern.test(raised.message));
		if (matched !== index) {
			throw new Error(
				`probe ${JSON.stringify(probe)} raises ${raised ? `"${raised.message}"` : "nothing"}, not "${entry.template}"`
			);
		}
		const at = /** @type {{ message: string, pos: number }} */ (raised).pos;
		/** @type {string | undefined} */
		let reasonCode;
		try {
			const { errors } = babel.parse(probe, {
				errorRecovery: true,
				sourceType,
				plugins: entry.importPhases
					? ["sourcePhaseImports", "deferredImportEvaluation"]
					: []
			});
			const error =
				errors.find(
					/**
					 * @param {{ pos: number }} item a recovered error
					 * @returns {boolean} whether it is the one our parser raised
					 */
					(item) => item.pos === at
				) || errors[0];
			reasonCode = error && error.reasonCode;
		} catch (error) {
			reasonCode = /** @type {{ reasonCode?: string }} */ (error).reasonCode;
		}
		if (reasonCode === undefined) {
			throw new Error(`Babel raises no error for ${JSON.stringify(probe)}`);
		}
		return [entry.template, kebabCase(reasonCode)];
	});
	// Last, for a message built at run time that no template above names.
	codes.push(["*", "syntax-error"]);
	return codes;
};

/**
 * Build the module the parser classifies with: the identifier ranges the
 * tokenizer reads and the property names `\\p{...}` accepts.
 * @returns {string} its source
 */
const renderData = () => {
	const tables = collectIdentifierTables();
	const nodeTables = collectNodeTables();
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
${renderNumberTable("NodeType", "Every node type the parser makes, by its ESTree name.", nodeTables.types)}
${renderNumberTable("Field", "The fields that hold a node or a list of them, by their ESTree name.", nodeTables.fields)}
${renderNumberTable("Flag", "The boolean fields, as bits of a node's flags.", nodeTables.flags)}
${renderNumberTable("Part", "The text fields beyond an identifier's name and a literal's value.", nodeTables.parts)}
// Each node type's fields as \`name:kind:slot\`, in the order its objects hold
// them; a flag's slot is its \`Flag\` bit, any other field's its place in the record.
/** @type {Record<string, string>} */
const NODE_FIELDS = ${JSON.stringify(collectNodeFields(), null, 1)};

module.exports.ASTRAL_IDENTIFIER_PART_RANGES = ASTRAL_IDENTIFIER_PART_RANGES;
module.exports.ASTRAL_IDENTIFIER_START_RANGES = ASTRAL_IDENTIFIER_START_RANGES;
module.exports.IDENTIFIER_PART_RANGES = IDENTIFIER_PART_RANGES;
module.exports.IDENTIFIER_START_RANGES = IDENTIFIER_START_RANGES;
module.exports.NARROW_IDENTIFIER_PART_RANGES = NARROW_IDENTIFIER_PART_RANGES;
module.exports.NARROW_IDENTIFIER_START_RANGES = NARROW_IDENTIFIER_START_RANGES;
module.exports.Field = Field;
module.exports.Flag = Flag;
module.exports.NODE_FIELDS = NODE_FIELDS;
module.exports.NodeType = NodeType;
module.exports.Part = Part;
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
 * Build the module only a parse reporting an error reads, so one reporting
 * none never loads its table.
 * @returns {string} its source
 */
const renderParseErrorCodes = () => `${renderHeader(
	`acorn ${acorn.version}, @babel/parser ${
		require(path.join(BABEL_PARSER, "../../package.json")).version
	}`
)}
// Each parse error message, \`*\` for its variable parts, with its code: Babel's
// \`reasonCode\` for the same error kebab-cased, where Babel has one.
/** @type {[string, string][]} */
const PARSE_ERROR_CODES = ${JSON.stringify(collectParseErrorCodes(), null, 1)};

module.exports = PARSE_ERROR_CODES;
`;

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
 * Write the generated modules, or report those that are stale.
 * @returns {Promise<void>} settles once each is written or checked
 */
const generate = async () => {
	await writeGenerated(DATA_TARGET, renderData());
	await writeGenerated(PRINTER_DATA_TARGET, renderPrinterData());
	await writeGenerated(PARSE_ERROR_CODES_TARGET, renderParseErrorCodes());
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
module.exports.collectNodeFields = collectNodeFields;
module.exports.collectNodeTables = collectNodeTables;
module.exports.collectParserTables = collectParserTables;
module.exports.collectUnicodeProperties = collectUnicodeProperties;
module.exports.encodeRanges = encodeRanges;
