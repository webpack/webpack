/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

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
}.

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
${renderUnicodeProperties()}${renderNativeObjects()}
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
module.exports.nativeObjectTables = nativeObjectTables;
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
module.exports.collectIdentifierTables = collectIdentifierTables;
module.exports.collectNarrowIdentifierTables = collectNarrowIdentifierTables;
module.exports.collectNativeObjects = collectNativeObjects;
module.exports.collectUnicodeProperties = collectUnicodeProperties;
module.exports.encodeRanges = encodeRanges;
