/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Derive every option schema from the TypeScript module that declares it.
// `declarations/**/*.ts` is the source and is written by hand; nothing here
// writes it.
//
//   node tooling/generate-schemas.js          # report what each source derives
//   node tooling/generate-schemas.js --write  # write those schemas
//   node tooling/generate-schemas.js --strict # report what an allowance forgives
//
// WHY: the report holds each derived schema against the committed one, so a
// source that stops deriving what webpack validates says so rather than
// rewriting it on the next run.

const fs = require("fs");
const path = require("path");
const prettier = require("prettier");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const SCHEMAS_DIRECTORY = path.resolve(ROOT, "schemas");
const TYPES_DIRECTORY = path.resolve(ROOT, "declarations");
const VOCABULARY_NAME = "vocabulary";

const write = process.argv.includes("--write");
const verbose = process.argv.includes("--verbose");
// Report every difference, including the ones an allowance would forgive.
const strict = process.argv.includes("--strict");

// The order every committed schema already writes its keywords in: a
// topological sort of the corpus, which has no conflicting pair, so a
// generated file is comparable to a committed one byte for byte.
const KEY_ORDER = [
	"$ref",
	"definitions",
	"exclude",
	"helper",
	"title",
	"description",
	"instanceof",
	"type",
	"absolutePath",
	"cli",
	"anyOf",
	"enum",
	"implements",
	"additionalProperties",
	"items",
	"minItems",
	"minLength",
	"minProperties",
	"minimum",
	"not",
	"oneOf",
	"experimental",
	"properties",
	"required",
	"added",
	"pattern",
	"undefinedAsNull",
	"tsType",
	"deprecated",
	"uniqueItems"
];

/**
 * @typedef {object} VocabularyEntry
 * @property {string} name the alias a source writes instead of the constraint
 * @property {string} typeParameter the parameter it takes, or the empty string
 * @property {string} underlying the TypeScript type it stands for
 * @property {string} description what the alias means, for its own declaration
 * @property {Record<string, string | number | boolean>} constraints the keywords it carries
 */

// WHY: every combination of validation-only keywords the committed schemas use,
// and the whole of what TypeScript cannot say on its own. Each is an alias
// rather than a tag because most sit on a union member, where no JSDoc block
// can attach. Most specific first: matching takes the first that fits.
/** @type {VocabularyEntry[]} */
const VOCABULARY = [
	{
		name: "NonEmptyRelativePath",
		typeParameter: "",
		underlying: "string",
		description: "A path that is neither empty nor absolute.",
		constraints: { type: "string", minLength: 1, absolutePath: false }
	},
	{
		name: "DottedIdentifier",
		typeParameter: "",
		underlying: "string",
		description: "A JavaScript identifier, or several joined by dots.",
		constraints: {
			type: "string",
			minLength: 1,
			pattern: "^[A-Za-z_$][A-Za-z0-9_$]*(\\.[A-Za-z_$][A-Za-z0-9_$]*)*$"
		}
	},
	{
		name: "AbsolutePath",
		typeParameter: "",
		underlying: "string",
		description: "An absolute path.",
		constraints: { type: "string", absolutePath: true }
	},
	{
		name: "RelativePath",
		typeParameter: "",
		underlying: "string",
		description: "A path that is not absolute.",
		constraints: { type: "string", absolutePath: false }
	},
	{
		name: "HttpUrl",
		typeParameter: "",
		underlying: "string",
		description: "A URL with the http or https scheme.",
		constraints: { type: "string", pattern: "^https?://" }
	},
	{
		name: "NonEmptyString",
		typeParameter: "",
		underlying: "string",
		description: "A string that is not empty.",
		constraints: { type: "string", minLength: 1 }
	},
	{
		name: "DevToolSpelling",
		typeParameter: "",
		underlying: "string",
		description: "A source map kind, spelled the way `devtool` takes it.",
		constraints: {
			type: "string",
			pattern:
				"^(inline-|hidden-|eval-)?(nosources-)?(cheap-(module-)?)?source-map(-debugids)?$"
		}
	},
	{
		name: "NonNegativeNumber",
		typeParameter: "",
		underlying: "number",
		description: "A number that is not negative.",
		constraints: { type: "number", minimum: 0 }
	},
	{
		name: "PositiveNumber",
		typeParameter: "",
		underlying: "number",
		description: "A number of at least one.",
		constraints: { type: "number", minimum: 1 }
	}
];

// Every keyword an alias may carry, which is also what a node must state none
// of beyond its own for that alias to be the right name for it.
const VOCABULARY_BY_NAME = new Map(
	VOCABULARY.map((entry) => [entry.name, entry])
);

/**
 * Walks a directory tree and answers with every JSON schema below it.
 * @param {string} directory the directory to read
 * @returns {string[]} absolute paths, sorted so a run reports in a stable order
 */
const findSchemas = (directory) => {
	/** @type {string[]} */
	const found = [];
	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		const absolute = path.resolve(directory, entry.name);
		if (entry.isDirectory() && absolute !== TYPES_DIRECTORY) {
			found.push(...findSchemas(absolute));
		} else if (entry.name.endsWith(".json")) {
			found.push(absolute);
		}
	}
	return found.sort();
};

/**
 * @param {unknown} value any value
 * @returns {value is Record<string, unknown>} whether it is a plain object
 */
const isObject = (value) =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Walks every node of a schema, replacing each with what the transform answers.
 * The keyword a node was reached through is passed along, which is how a node
 * inside a union is told apart from one a property names.
 * @param {unknown} value the schema, or any part of one
 * @param {(node: Record<string, EXPECTED_ANY>, through: string) => Record<string, EXPECTED_ANY>} transform what each node becomes
 * @param {string} through the keyword this node was reached through
 * @returns {unknown} the rewritten schema
 */
const walkSchema = (value, transform, through = "") => {
	if (Array.isArray(value)) {
		return value.map((one) => walkSchema(one, transform, through));
	}
	if (!isObject(value)) return value;
	const node = transform(
		/** @type {Record<string, EXPECTED_ANY>} */ (value),
		through
	);
	/** @type {Record<string, unknown>} */
	const walked = {};
	for (const [keyword, nested] of Object.entries(node)) {
		if (keyword !== "properties" && keyword !== "definitions") {
			walked[keyword] = walkSchema(nested, transform, keyword);
			continue;
		}
		/** @type {Record<string, unknown>} */
		const inner = {};
		for (const [name, schema] of Object.entries(
			/** @type {Record<string, unknown>} */ (nested)
		)) {
			inner[name] = walkSchema(schema, transform, "");
		}
		walked[keyword] = inner;
	}
	return walked;
};

/**
 * @param {Record<string, EXPECTED_ANY>} node a schema node
 * @param {string[]} keywords the keywords to leave out
 * @returns {Record<string, EXPECTED_ANY>} the node without them
 */
const omit = (node, keywords) => {
	/** @type {Record<string, EXPECTED_ANY>} */
	const kept = {};
	for (const [keyword, value] of Object.entries(node)) {
		if (!keywords.includes(keyword)) kept[keyword] = value;
	}
	return kept;
};

/**
 * Rewrites a schema so its keywords appear in the order the corpus uses.
 * @param {unknown} value the schema, or any part of one
 * @returns {unknown} the same schema with every object's keys reordered
 */
const orderKeys = (value) =>
	walkSchema(value, (node) => {
		/** @type {Record<string, EXPECTED_ANY>} */
		const ordered = {};
		const rank = (/** @type {string} */ keyword) => {
			const at = KEY_ORDER.indexOf(keyword);
			return at === -1 ? KEY_ORDER.length : at;
		};
		for (const keyword of Object.keys(node).sort((a, b) => rank(a) - rank(b))) {
			ordered[keyword] = node[keyword];
		}
		return ordered;
	});

/**
 * Strips a pair of parentheses that wraps a whole type, which changes nothing
 * about what the type is.
 * @param {string} text a type's source text
 * @returns {string} the same type, unwrapped
 */
const unwrapType = (text) => {
	let current = text.trim();
	while (current.startsWith("(") && current.endsWith(")")) {
		let depth = 0;
		let wraps = true;
		for (let at = 0; at < current.length; at++) {
			if (current[at] === "(") depth++;
			if (current[at] === ")") depth--;
			if (depth === 0 && at < current.length - 1) wraps = false;
		}
		if (!wraps) return current;
		current = current.slice(1, -1).trim();
	}
	return current;
};

// The quote a module specifier takes on each side: TypeScript source is written
// with double quotes, and `webpack/format-schema` writes a schema with single.
const IMPORT_SPECIFIER_REGEXP = /import\(\s*(["'])([^"']+)\1\s*\)/g;

/**
 * @param {string} text source text holding `import("…")` specifiers
 * @param {string} quote the quote to write each specifier with
 * @returns {string} the text, with every specifier quoted that way
 */
const quoteImports = (text, quote) =>
	text.replace(
		IMPORT_SPECIFIER_REGEXP,
		(whole, held, specifier) => `import(${quote}${specifier}${quote})`
	);

/**
 * A `tsType` is source text, so the same type reads differently depending on
 * which quote its author reached for.
 * @param {unknown} value the schema, or any part of one
 * @returns {unknown} the same schema with every `tsType` quoted one way
 */
const normalizeTsTypes = (value) =>
	walkSchema(value, (node) =>
		typeof node.tsType === "string"
			? {
					...node,
					tsType: unwrapType(node.tsType)
						.replace(IMPORT_SPECIFIER_REGEXP, "import($2)")
						.replace(/\s+/g, " ")
						.replace(/;\s*/g, ", ")
						.replace(/,\s*}/g, " }")
				}
			: node
	);

/**
 * @typedef {object} Allowance
 * @property {string} name what the two documents are allowed to differ by
 * @property {(schema: unknown) => unknown} apply what it rewrites away
 */

// WHY: five differences say nothing about whether the types carry the schema,
// so a run reports them apart from a failure. Each leaves what the validator
// does untouched: a keyword another implies, an order nothing reads, a shape
// `$ref` already expresses, or prose where TypeScript has no syntax for it.
/** @type {Allowance[]} */
const ALLOWANCES = [
	{
		name: "a description on a union branch or an array item",
		apply: (schema) =>
			walkSchema(schema, (node, through) => {
				if (through !== "anyOf" && through !== "items") return node;
				const kept = omit(node, ["description"]);
				const only = Object.keys(kept).length === 1;
				return only && Array.isArray(kept.oneOf) && kept.oneOf.length === 1
					? kept.oneOf[0]
					: kept;
			})
	},
	{
		name: "the order a required list names its properties in",
		apply: (schema) =>
			walkSchema(schema, (node) =>
				Array.isArray(node.required)
					? { ...node, required: [...node.required].sort() }
					: node
			)
	},
	{
		name: "an enum branch flattened into the union around it",
		apply: (schema) =>
			walkSchema(schema, (node) =>
				Array.isArray(node.anyOf)
					? {
							...node,
							anyOf: node.anyOf.flatMap(
								(/** @type {Record<string, EXPECTED_ANY>} */ branch) =>
									Array.isArray(branch.enum) && Object.keys(branch).length === 1
										? branch.enum.map((one) => ({ enum: [one] }))
										: [branch]
							)
						}
					: node
			)
	},
	{
		name: "a titled object written inline rather than as a definition",
		apply: (schema) => {
			const document = /** @type {Record<string, EXPECTED_ANY>} */ (schema);
			/** @type {Record<string, EXPECTED_ANY>} */
			const definitions = { ...document.definitions };
			const lifted = walkSchema(
				omit(document, ["definitions"]),
				(node, through) => {
					if (through === "" || !node.properties) return node;
					if (typeof node.title !== "string") return node;
					definitions[node.title] = omit(node, ["title"]);
					return { $ref: `#/definitions/${node.title}` };
				}
			);
			const walked = /** @type {Record<string, EXPECTED_ANY>} */ (lifted);
			return Object.keys(definitions).length > 0
				? { ...walked, definitions }
				: walked;
		}
	},
	{
		name: "a type keyword the enum beside it already implies",
		apply: (schema) =>
			walkSchema(schema, (node) => (node.enum ? omit(node, ["type"]) : node))
	}
];

/**
 * @param {unknown} schema a schema
 * @param {Allowance[]} allowances the differences to rewrite away
 * @returns {unknown} the schema each of them has been applied to
 */
const allow = (schema, allowances) =>
	allowances.reduce((current, allowance) => allowance.apply(current), schema);

/**
 * @param {unknown} left one value
 * @param {unknown} right the other
 * @returns {boolean} whether the two are structurally equal
 */
const deepEqual = (left, right) =>
	JSON.stringify(orderKeys(normalizeTsTypes(left))) ===
	JSON.stringify(orderKeys(normalizeTsTypes(right)));

/**
 * Names every place two schemas stop agreeing, deepest first, so a file that
 * does not round trip reports what is left to do rather than one path of it.
 * @param {unknown} expected the committed schema
 * @param {unknown} actual the generated one
 * @param {string} at the path walked so far
 * @returns {string[]} one line per difference, empty when the two are equal
 */
const findDifferences = (expected, actual, at = "") => {
	if (deepEqual(expected, actual)) return [];
	/** @type {string[]} */
	const found = [];
	if (isObject(expected) && isObject(actual)) {
		const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
		for (const key of [...keys].sort()) {
			found.push(
				...findDifferences(expected[key], actual[key], `${at}/${key}`)
			);
		}
	} else if (Array.isArray(expected) && Array.isArray(actual)) {
		for (let i = 0; i < Math.max(expected.length, actual.length); i++) {
			found.push(...findDifferences(expected[i], actual[i], `${at}/${i}`));
		}
	}
	if (found.length > 0) return found;
	const show = (/** @type {unknown} */ value) =>
		value === undefined ? "(missing)" : JSON.stringify(value).slice(0, 90);
	return [
		`${at || "/"}: expected ${show(expected)}, generated ${show(actual)}`
	];
};

// #region schema to TypeScript

/**
 * @param {string} text prose read back out of a comment
 * @returns {string} the same prose, as the schema states it
 */
const unescapeComment = (text) => text.replace(/\*\\\//g, "*/");

/**
 * A reference either points inside the same schema or at a definition of
 * another one, which is an import rather than a local name.
 * @param {string} reference the pointer a `$ref` holds
 * @returns {{ name: string, from: string }} the name, and the module it comes from
 */
const readReference = (reference) => {
	const [file, pointer] = reference.split("#/definitions/");
	return { name: pointer, from: file.replace(/\.json$/, "") };
};

/**
 * @typedef {object} EmitContext
 * @property {{ text: string, name: string }[]} lifted declarations pulled out of a nested node
 * @property {Map<string, Set<string>>} imports names to import, keyed by module
 * @property {Map<string, Record<string, EXPECTED_ANY>>} said the definitions by name
 */

/**
 * The two halves of one definition, or an empty name for anything else.
 * @param {ts.IntersectionTypeNode} node the intersection to read
 * @param {Map<string, string>} known what each name the file declares says
 * @returns {string} the definition both halves belong to
 */
const halvedReference = (node, known) => {
	if (node.types.length !== 2) return "";
	const [first, second] = node.types.map((one) =>
		ts.isTypeReferenceNode(one) ? one.typeName.getText() : ""
	);
	const base = first.replace(/Known$/, "");
	return first === `${base}Known` &&
		second === `${base}Unknown` &&
		known.has(first) &&
		known.has(second)
		? base
		: "";
};

// #endregion

// #region TypeScript to schema

/**
 * Builds a program over the given sources, reading anything they import from
 * disk, so a type imported out of `lib/` resolves the way it does in a build.
 * @param {Map<string, string>} sources file contents, keyed by absolute path
 * @returns {ts.Program} the program over them
 */
const createProgram = (sources) => {
	const options = {
		allowJs: true,
		checkJs: false,
		noEmit: true,
		strict: false,
		target: ts.ScriptTarget.ES2017,
		module: ts.ModuleKind.CommonJS,
		esModuleInterop: true,
		skipLibCheck: true
	};
	const host = ts.createCompilerHost(options, true);
	const readFile = host.readFile.bind(host);
	const fileExists = host.fileExists.bind(host);
	const getSourceFile = host.getSourceFile.bind(host);
	host.readFile = (fileName) =>
		sources.get(path.resolve(fileName)) || readFile(fileName);
	host.fileExists = (fileName) =>
		sources.has(path.resolve(fileName)) || fileExists(fileName);
	host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
		const overlay = sources.get(path.resolve(fileName));
		return overlay === undefined
			? getSourceFile(fileName, languageVersion, onError, shouldCreate)
			: ts.createSourceFile(fileName, overlay, languageVersion, true);
	};
	return ts.createProgram([...sources.keys()], options, host);
};

/**
 * @param {ts.Node} node any node
 * @returns {{ description: string, tags: Map<string, string> }} what its JSDoc says
 */
const readJsDoc = (node) => {
	const blocks = /** @type {{ jsDoc?: ts.JSDoc[] }} */ (
		/** @type {unknown} */ (node)
	).jsDoc;
	/** @type {Map<string, string>} */
	const tags = new Map();
	if (!blocks || blocks.length === 0) return { description: "", tags };
	const block = blocks[blocks.length - 1];
	for (const tag of block.tags || []) {
		tags.set(
			tag.tagName.text,
			typeof tag.comment === "string" ? tag.comment.trim() : ""
		);
	}
	return {
		description:
			typeof block.comment === "string"
				? unescapeComment(block.comment.trim())
				: "",
		tags
	};
};

// The keywords a declaration states as a tag rather than through an alias.
// The keywords an array states about itself rather than about its items, which
// share one comment position with it.
const ARRAY_CONSTRAINTS = ["minItems", "uniqueItems"];

const CONSTRAINT_TAGS = [
	"minLength",
	"uniqueItems",
	"absolutePath",
	"pattern",
	"minimum",
	"minItems",
	"minProperties"
];

/**
 * @param {Map<string, string>} tags the tags a declaration carries
 * @returns {Record<string, EXPECTED_ANY>} the keywords they become
 */
const fromDocumentationTags = (tags) => {
	/** @type {Record<string, EXPECTED_ANY>} */
	const keywords = {};
	if (tags.has("since")) {
		keywords.added = /** @type {string} */ (tags.get("since"));
	}
	if (tags.has("experimental")) keywords.experimental = true;
	if (tags.has("deprecated")) keywords.deprecated = true;
	if (tags.has("undefinedAsNull")) keywords.undefinedAsNull = true;
	if (tags.has("cliHelper")) keywords.cli = { ...keywords.cli, helper: true };
	if (tags.has("cliExclude")) keywords.cli = { ...keywords.cli, exclude: true };
	if (tags.has("implements")) {
		keywords.implements = /** @type {string} */ (tags.get("implements"))
			.split(",")
			.map((one) => one.trim());
	}
	if (tags.has("not")) {
		keywords.not = JSON.parse(/** @type {string} */ (tags.get("not")));
	}
	if (tags.has("additionalProperties")) keywords.additionalProperties = true;
	if (tags.has("emptyProperties")) keywords.properties = {};
	if (tags.has("properties")) {
		keywords.properties = JSON.parse(
			/** @type {string} */ (tags.get("properties"))
		);
	}
	if (tags.has("typeOnly")) keywords.typeOnly = true;
	if (tags.has("inline")) keywords.inline = true;
	if (tags.has("jsonType")) keywords.type = tags.get("jsonType");
	if (tags.has("tsType")) keywords.tsType = tags.get("tsType");
	if (tags.has("required")) {
		keywords.required = /** @type {string} */ (tags.get("required"));
	}
	for (const keyword of CONSTRAINT_TAGS) {
		const written = tags.get(keyword);
		if (written === undefined) continue;
		keywords[keyword] =
			written === "true" || written === "false"
				? written === "true"
				: /^\d+$/.test(written)
					? Number(written)
					: written;
	}
	return keywords;
};

/**
 * An array's item type, carrying the description written in front of it.
 * @param {ts.TypeNode} node the item type
 * @param {ts.TypeChecker} checker the checker that resolves its references
 * @param {Map<string, string>} known what each name declared in the same file says
 * @returns {Record<string, EXPECTED_ANY>} the schema for the items
 */
/**
 * Whether the tags alone say what the node is, because the source wrote its
 * `tsType` in place of a shape it has none of.
 * @param {Record<string, EXPECTED_ANY>} stated what the tags say
 * @returns {boolean} whether the parsed type underneath adds nothing
 */
const tagsAreWholeType = (stated) =>
	Boolean(stated.tsType) &&
	stated.type === "object" &&
	isObject(stated.properties) &&
	Object.keys(stated.properties).length === 0;

/**
 * The item type of an array, with the description written in front of it.
 * @param {ts.TypeNode} node the item type
 * @param {ts.TypeChecker} checker the checker that resolves its references
 * @param {Map<string, string>} known what each name declared in the same file says
 * @returns {Record<string, EXPECTED_ANY>} the schema the items are
 */
const describedItems = (node, checker, known) => {
	const items = fromTypeNode(node, checker, known, 1);
	const held = ts.isUnionTypeNode(node) ? node.types[0] : node;
	const { description, tags } = readLeadingComment(held, 0, node.pos);
	const stated = omit(fromDocumentationTags(tags), ARRAY_CONSTRAINTS);
	const carries = description !== "" || Object.keys(stated).length > 0;
	return carries
		? {
				...(description ? { description } : {}),
				...stated,
				...wrapReference(items, carries)
			}
		: items;
};

// The tags a leading comment may carry, matched by name so prose holding an
// "@" is left alone. `not` takes JSON, so it reads to the end of the comment.
const KNOWN_TAG_REGEXP = new RegExp(
	`@(since|experimental|deprecated|undefinedAsNull|cliHelper|cliExclude|implements|additionalProperties|emptyProperties|properties|typeOnly|tsType|jsonType|inline|not|${CONSTRAINT_TAGS.join("|")})(?:[ \\t]+([^@]*))?`
);

/**
 * The description a source wrote in front of a type, where no JSDoc block can
 * attach: a union branch, or the item type of an array.
 * @param {ts.TypeNode} node the type to read in front of
 * @param {number} at which of the comments there to read, when several share it
 * @param {number} from where to start looking, for a caller that knows better
 * @returns {{ description: string, tags: Map<string, string> }} what it says
 */
const readLeadingComment = (node, at = 0, from = node.pos) => {
	const text = node.getSourceFile().text.slice(from, node.getStart());
	const blocks = [...text.matchAll(/\/\*\*([\s\S]*?)\*\//g)];
	const empty = { description: "", tags: new Map() };
	if (at >= blocks.length) return empty;
	const inside = unescapeComment(blocks[at][1].trim());
	/** @type {Map<string, string>} */
	const tags = new Map();
	for (const tag of inside.matchAll(new RegExp(KNOWN_TAG_REGEXP, "g"))) {
		tags.set(tag[1], tag[2] ? tag[2].trim() : "");
	}
	const starts = inside.search(KNOWN_TAG_REGEXP);
	return {
		description: (starts === -1 ? inside : inside.slice(0, starts)).trim(),
		tags
	};
};

/**
 * A type's own source text, as a schema states it: prettier is free to wrap a
 * long one across lines, and the keyword is a single-line string.
 * @param {ts.TypeNode} node the type to write out
 * @returns {string} its text
 */
const toTsType = (node) =>
	quoteImports(
		node
			.getText()
			.replace(/\s+/g, " ")
			.replace(/([<(])\s+/g, "$1")
			.replace(/\s+([>)])/g, "$1")
			.replace(/(=>|[(<:,])\s*\|\s*/g, "$1 ")
			// WHY: the corpus writes a type in one spelling and TypeScript prints it
			// in another, so what a source round-trips through is put back.
			.replace(/"([^"\\]*)"/g, "'$1'")
			.replace(/;\s*/g, ", ")
			.replace(/,\s*\}/g, " }"),
		"'"
	);

/**
 * @param {ts.Type} type a resolved type
 * @returns {boolean} whether a value of it is a function
 */
const isCallable = (type) =>
	type.getCallSignatures().length > 0 ||
	type.getConstructSignatures().length > 0;

/**
 * Turns one TypeScript type node into a schema node.
 * @param {ts.TypeNode} node the type to read
 * @param {ts.TypeChecker} checker the checker that resolves its references
 * @param {Map<string, string>} known what each name declared in the same file says
 * @param {number} spoken how many comments in front of it a caller already read
 * @returns {Record<string, EXPECTED_ANY>} the schema node
 */
const fromTypeNode = (node, checker, known, spoken = 0) => {
	// WHY: a function type written out is a `tsType` like a named one, and the
	// parentheses around it are part of what the schema states.
	const callable = ts.isParenthesizedTypeNode(node) ? node.type : node;
	if (ts.isFunctionTypeNode(callable) || ts.isConstructorTypeNode(callable)) {
		return { instanceof: "Function", tsType: toTsType(node) };
	}
	if (ts.isParenthesizedTypeNode(node)) {
		return fromTypeNode(node.type, checker, known);
	}
	if (ts.isUnionTypeNode(node)) {
		const branches = node.types.map((one) => {
			const described = fromTypeNode(one, checker, known);
			// WHY: prettier moves the bar between two comments that meet, so where
			// the first branch's own comment starts is not fixed. Reading from the
			// union's start covers both layouts, and the caller's comes first.
			const first = one === node.types[0];
			const { description, tags } = readLeadingComment(
				one,
				first ? spoken : 0,
				first ? node.pos : one.pos
			);
			const stated = fromDocumentationTags(tags);
			const carries = description !== "" || Object.keys(stated).length > 0;
			return carries
				? {
						...(description ? { description } : {}),
						...stated,
						...(tagsAreWholeType(stated)
							? {}
							: wrapReference(described, carries))
					}
				: described;
		});
		// WHY: a union of nothing but literals is one `enum`, which is how the
		// corpus writes it — an `anyOf` of single-valued branches says the same
		// thing in more keywords and would not round-trip.
		// WHY: no JSON value is `undefined`, so a union naming it states the one
		// keyword that stands for it and keeps its own text as the type.
		const absent = node.types.some(
			(one) => one.kind === ts.SyntaxKind.UndefinedKeyword
		);
		const named = absent
			? branches.filter((branch) => branch.type !== "undefined")
			: branches;
		const grouped = node.types.some((one) => ts.isParenthesizedTypeNode(one));
		const plain =
			!grouped &&
			named.every(
				(branch) => Array.isArray(branch.enum) && !branch.description
			);
		const union = plain
			? { enum: named.flatMap((branch) => branch.enum) }
			: { anyOf: named };
		return absent
			? { ...union, undefinedAsNull: true, tsType: toTsType(node) }
			: union;
	}
	if (ts.isArrayTypeNode(node)) {
		// WHY: an array and its item share one comment position, so what the array
		// itself states is taken here and left out of the items below.
		const { tags } = readLeadingComment(node.elementType, 0, node.pos);
		const stated = fromDocumentationTags(tags);
		/** @type {Record<string, EXPECTED_ANY>} */
		const constraints = {};
		for (const keyword of ARRAY_CONSTRAINTS) {
			if (stated[keyword] !== undefined) constraints[keyword] = stated[keyword];
		}
		return {
			type: "array",
			...constraints,
			items: describedItems(node.elementType, checker, known)
		};
	}
	if (ts.isLiteralTypeNode(node)) {
		const literal = node.literal;
		if (literal.kind === ts.SyntaxKind.NullKeyword) return { enum: [null] };
		if (literal.kind === ts.SyntaxKind.TrueKeyword) return { enum: [true] };
		if (literal.kind === ts.SyntaxKind.FalseKeyword) return { enum: [false] };
		if (ts.isStringLiteral(literal)) return { enum: [literal.text] };
		if (ts.isNumericLiteral(literal)) return { enum: [Number(literal.text)] };
	}
	// WHY: an intersection names a value the schema has no vocabulary for, so it
	// travels as its own text the way a reference to one does.
	if (ts.isIntersectionTypeNode(node)) {
		const base = halvedReference(node, known);
		if (base !== "") return { $ref: `#/definitions/${base}` };
		if (node.types.every((one) => ts.isTypeLiteralNode(one))) {
			const members = node.types.flatMap((one) => [
				.../** @type {ts.TypeLiteralNode} */ (one).members
			]);
			return fromMembers(
				/** @type {ts.NodeArray<ts.TypeElement>} */ (
					/** @type {unknown} */ (members)
				),
				checker,
				known,
				{}
			);
		}
		return { type: "object", tsType: toTsType(node) };
	}
	if (ts.isTypeLiteralNode(node)) {
		return fromMembers(node.members, checker, known, {});
	}
	if (ts.isImportTypeNode(node)) {
		const type = checker.getTypeFromTypeNode(node);
		const tsType = toTsType(node);
		return isCallable(type)
			? { instanceof: "Function", tsType }
			: { type: "object", tsType };
	}
	if (ts.isTypeReferenceNode(node)) {
		const name = node.typeName.getText();
		const entry = VOCABULARY_BY_NAME.get(name);
		if (entry) {
			const constraints = { ...entry.constraints };
			const argument = node.typeArguments && node.typeArguments[0];
			if (argument && constraints.type === "array") {
				return {
					...constraints,
					items: describedItems(argument, checker, known)
				};
			}
			if (argument && constraints.type === "object") {
				const values = fromTypeNode(argument, checker, known);
				return values.type === "unknown"
					? constraints
					: { ...constraints, additionalProperties: values };
			}
			return constraints;
		}
		if (name === "Array") {
			const argument = /** @type {ts.NodeArray<ts.TypeNode>} */ (
				node.typeArguments
			)[0];
			return {
				type: "array",
				items: describedItems(argument, checker, known)
			};
		}
		if (name === "RegExp") return { instanceof: "RegExp", tsType: "RegExp" };
		if (known.has(name)) return { $ref: `#/definitions/${name}` };
		if (name === "Record") {
			return { type: "object", tsType: toTsType(node) };
		}
		const type = checker.getTypeFromTypeNode(node);
		return isCallable(type)
			? { instanceof: "Function", tsType: toTsType(node) }
			: { type: "object", tsType: toTsType(node) };
	}
	switch (node.kind) {
		case ts.SyntaxKind.StringKeyword:
			return { type: "string" };
		case ts.SyntaxKind.NumberKeyword:
			return { type: "number" };
		case ts.SyntaxKind.BooleanKeyword:
			return { type: "boolean" };
		case ts.SyntaxKind.NullKeyword:
			return { enum: [null] };
		case ts.SyntaxKind.AnyKeyword:
		case ts.SyntaxKind.UnknownKeyword:
			return { type: "unknown" };
		case ts.SyntaxKind.UndefinedKeyword:
			return { type: "undefined" };
		default:
			return { type: "unknown" };
	}
};

/**
 * @param {ts.NodeArray<ts.TypeElement>} members the members of an interface or type literal
 * @param {ts.TypeChecker} checker the checker that resolves their types
 * @param {Map<string, string>} known what each name declared in the same file says
 * @param {Record<string, EXPECTED_ANY>} head keywords the declaration itself carries
 * @returns {Record<string, EXPECTED_ANY>} the object schema they become
 */
const fromMembers = (members, checker, known, head) => {
	/** @type {Record<string, EXPECTED_ANY>} */
	const properties = {};
	/** @type {string[]} */
	const required = [];
	// WHY: an index signature says nothing a schema keyword does not, so what it
	// holds is read from the `@additionalProperties` tag rather than from it.
	/** @type {Record<string, EXPECTED_ANY> | boolean | undefined} */
	let additionalProperties = false;
	for (const member of members) {
		if (ts.isIndexSignatureDeclaration(member)) {
			const valueType = /** @type {ts.TypeNode} */ (member.type);
			if (
				valueType.kind === ts.SyntaxKind.AnyKeyword ||
				valueType.kind === ts.SyntaxKind.UnknownKeyword
			) {
				additionalProperties = undefined;
				continue;
			}
			const { description, tags } = readJsDoc(member);
			const value = fromTypeNode(valueType, checker, known);
			additionalProperties = {
				...(description ? { description } : {}),
				...fromDocumentationTags(tags),
				...wrapReference(value, Boolean(description))
			};
			continue;
		}
		if (!ts.isPropertySignature(member) || !member.type) continue;
		const name = ts.isIdentifier(member.name)
			? member.name.text
			: /** @type {ts.StringLiteral} */ (member.name).text;
		const { description: written, tags } = readJsDoc(member);
		const value = fromTypeNode(member.type, checker, known);
		// WHY: a member written as a bare reference carries the definition's own
		// documentation, which the schema states there rather than twice.
		const echoed =
			Boolean(value.$ref) &&
			known.get(readReference(value.$ref).name) === written;
		const description = echoed ? "" : written;
		const stated = echoed ? {} : fromDocumentationTags(tags);
		const carries = description !== "" || Object.keys(stated).length > 0;
		properties[name] = applyTypeOnly({
			...(description ? { description } : {}),
			...stated,
			...wrapReference(value, carries)
		});
		if (!member.questionToken) required.push(name);
	}
	return toObjectSchema(head, properties, required, additionalProperties);
};

/**
 * @param {Record<string, EXPECTED_ANY>} head keywords the declaration carries
 * @param {Record<string, EXPECTED_ANY>} properties the members it declares
 * @param {string[]} required the members it does not make optional
 * @param {Record<string, EXPECTED_ANY> | boolean | undefined} additionalProperties what else it admits
 * @returns {Record<string, EXPECTED_ANY>} the object schema they are
 */
const toObjectSchema = (head, properties, required, additionalProperties) => {
	const stated = head.required;
	if (typeof stated === "string") {
		const order = stated.split(",").map((name) => name.trim());
		required.sort((a, b) => order.indexOf(a) - order.indexOf(b));
	}
	const named = Object.keys(properties).length > 0;
	return {
		...omit(head, ["required"]),
		type: "object",
		...(additionalProperties === undefined ? {} : { additionalProperties }),
		...(named ? { properties } : {}),
		...(required.length > 0 ? { required } : {})
	};
};

/**
 * The same as `fromMembers`, for an object written as a JSDoc `@typedef` whose
 * members are `@property` tags rather than an interface's.
 * @param {readonly ts.JSDocPropertyLikeTag[]} propertyTags the `@property` tags
 * @param {ts.TypeChecker} checker the checker that resolves their types
 * @param {Map<string, string>} known what each name declared in the file says
 * @param {Record<string, EXPECTED_ANY>} head keywords the typedef carries
 * @returns {Record<string, EXPECTED_ANY>} the object schema they are
 */
const fromPropertyTags = (propertyTags, checker, known, head) => {
	/** @type {Record<string, EXPECTED_ANY>} */
	const properties = {};
	/** @type {string[]} */
	const required = [];
	for (const tag of propertyTags) {
		const held = /** @type {ts.JSDocTypeExpression} */ (tag.typeExpression);
		const optional = ts.isJSDocOptionalType(held.type);
		const node = optional
			? /** @type {ts.JSDocOptionalType} */ (held.type).type
			: held.type;
		const name = tag.name.getText();
		const written =
			typeof tag.comment === "string"
				? unescapeComment(tag.comment.trim())
				: "";
		const value = fromTypeNode(node, checker, known);
		// WHY: a member written as a bare reference carries the definition's own
		// documentation, which the schema states there rather than twice.
		const echoed =
			Boolean(value.$ref) &&
			known.get(readReference(value.$ref).name) === written;
		const description = echoed ? "" : written;
		properties[name] = applyTypeOnly({
			...(description ? { description } : {}),
			...wrapReference(value, description !== "")
		});
		if (!optional && !tag.isBracketed) required.push(name);
	}
	return toObjectSchema(head, properties, required, false);
};

/**
 * Drops the `type` a schema would otherwise state, for a node whose `tsType` is
 * there to name the value rather than to validate it.
 * @param {Record<string, EXPECTED_ANY>} schema a node built from a declaration
 * @returns {Record<string, EXPECTED_ANY>} the node the source asked for
 */
const applyTypeOnly = (schema) =>
	schema.typeOnly ? omit(schema, ["type", "typeOnly"]) : schema;

/**
 * A `$ref` takes no siblings, so one that needs a description is wrapped.
 * @param {Record<string, EXPECTED_ANY>} schema the node a member became
 * @param {boolean} described whether it carries a description
 * @returns {Record<string, EXPECTED_ANY>} the node, wrapped where it has to be
 */
const wrapReference = (schema, described) =>
	described && schema.$ref && Object.keys(schema).length === 1
		? { oneOf: [schema] }
		: schema;

/**
 * Derives a schema from one source file.
 * @param {ts.SourceFile} source the file to read
 * @param {ts.TypeChecker} checker the checker that resolves its references
 * @returns {Record<string, EXPECTED_ANY>} the schema it describes
 */
const typeScriptToSchema = (source, checker) => {
	// WHY: a schema that is nothing but a reference to another one is written as
	// a re-export, which is the whole file and carries no title of its own.
	for (const statement of source.statements) {
		if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier) {
			continue;
		}
		const { tags } = readJsDoc(statement);
		if (!tags.has("schema")) continue;
		const exported = /** @type {ts.NamedExports} */ (statement.exportClause);
		const from = /** @type {ts.StringLiteral} */ (statement.moduleSpecifier)
			.text;
		return {
			$ref: `${from}.json#/definitions/${exported.elements[0].name.text}`
		};
	}
	/** @type {ts.Statement[]} */
	const declarations = source.statements.filter(
		(statement) =>
			ts.isTypeAliasDeclaration(statement) ||
			ts.isInterfaceDeclaration(statement)
	);
	const known = new Map(
		declarations.map((declaration) => [
			/** @type {ts.InterfaceDeclaration} */ (declaration).name.getText(),
			readJsDoc(declaration).description
		])
	);
	/** @type {Record<string, EXPECTED_ANY>} */
	const definitions = {};
	/** @type {Map<string, Record<string, EXPECTED_ANY>>} */
	const inlined = new Map();
	/** @type {Record<string, EXPECTED_ANY> | undefined} */
	let root;
	/** @type {string} */
	let rootName = "";
	for (const declaration of declarations) {
		const name = /** @type {ts.InterfaceDeclaration} */ (
			declaration
		).name.getText();
		const { description, tags } = readJsDoc(declaration);
		const keywords = fromDocumentationTags(tags);
		const body = ts.isInterfaceDeclaration(declaration)
			? fromMembers(declaration.members, checker, known, keywords)
			: fromTypeNode(
					/** @type {ts.TypeAliasDeclaration} */ (declaration).type,
					checker,
					known
				);
		const stated = omit(keywords, ["required"]);
		const carries = description !== "" || Object.keys(stated).length > 0;
		const schema = applyTypeOnly({
			...(description ? { description } : {}),
			...stated,
			...wrapReference(body, carries)
		});
		if (
			ts.isTypeAliasDeclaration(declaration) &&
			ts.isIntersectionTypeNode(declaration.type) &&
			halvedReference(declaration.type, known) === name
		) {
			continue;
		}
		const half = /^(.+)(Known|Unknown)$/.exec(name);
		const base = half ? half[1] : "";
		if (half && known.has(`${base}Known`) && known.has(`${base}Unknown`)) {
			if (half[2] === "Known") {
				definitions[base] = schema;
			} else if (definitions[base]) {
				definitions[base].additionalProperties = schema.additionalProperties;
			}
			continue;
		}
		if (tags.has("schema")) {
			root = schema;
			rootName = name;
		} else if (tags.has("inline")) {
			inlined.set(name, { title: name, ...omit(schema, ["inline"]) });
		} else {
			definitions[name] = schema;
		}
	}
	const document = root
		? {
				...(Object.keys(definitions).length > 0 ? { definitions } : {}),
				title: rootName,
				...(root.description ? { description: root.description } : {}),
				...wrapReference(omit(root, ["description"]), true)
			}
		: { definitions };
	const resolved = walkSchema(document, (node) => {
		const held = node.$ref && inlined.get(readReference(node.$ref).name);
		return held || node;
	});
	return /** @type {Record<string, EXPECTED_ANY>} */ (resolved);
};

// #endregion

/**
 * A `tsType` names a module the way the schema's own directory reaches it, so a
 * source at another depth has to say the same thing its own way.
 * @param {string} text source text holding `import("…")` specifiers
 * @param {string} fromDirectory the directory the specifiers are relative to
 * @param {string} toDirectory the directory they should be relative to
 * @returns {string} the text, with every relative specifier re-pointed
 */
const repointImports = (text, fromDirectory, toDirectory) =>
	text.replace(IMPORT_SPECIFIER_REGEXP, (whole, held, specifier) => {
		if (!specifier.startsWith(".")) return whole;
		const target = path.resolve(fromDirectory, specifier);
		const next = path.relative(toDirectory, target).split(path.sep).join("/");
		return `import(${held}${next.startsWith(".") ? next : `./${next}`}${held})`;
	});

/**
 * @param {string} filePath the file the text is written to
 * @param {string} text the text to format
 * @returns {Promise<string>} the text, formatted the way the repository writes it
 */
const format = async (filePath, text) => {
	const options = await prettier.resolveConfig(filePath);
	const once = await prettier.format(text, { ...options, filepath: filePath });
	// WHY: where two comments meet at one position prettier moves the bar between
	// them on a second pass, so a file is written at that second pass's shape.
	return prettier.format(once, { ...options, filepath: filePath });
};

/**
 * @param {string} filePath where to write
 * @param {string} text what to write
 * @returns {boolean} whether the file changed
 */
const writeFile = (filePath, text) => {
	if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") === text) {
		return false;
	}
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, text);
	return true;
};

/**
 * Bootstraps every committed schema into TypeScript, derives the schema back
 * out of it, and reports where the two disagree.
 * @returns {Promise<void>}
 */
const main = async () => {
	const schemaFiles = findSchemas(SCHEMAS_DIRECTORY);
	/** @type {Map<string, string>} */
	const sources = new Map();
	/** @type {Map<string, string>} */
	const sourceOf = new Map();
	const vocabularyPath = path.resolve(TYPES_DIRECTORY, `${VOCABULARY_NAME}.ts`);
	sources.set(vocabularyPath, fs.readFileSync(vocabularyPath, "utf8"));

	for (const schemaFile of schemaFiles) {
		const relative = path
			.relative(SCHEMAS_DIRECTORY, schemaFile)
			.replace(/\.json$/, ".ts")
			.split(path.sep)
			.join("/");
		const target = path.resolve(TYPES_DIRECTORY, relative);
		if (!fs.existsSync(target)) {
			throw new Error(`${relative} declares no options in declarations/`);
		}
		sources.set(target, fs.readFileSync(target, "utf8"));
		sourceOf.set(target, schemaFile);
	}

	const program = createProgram(sources);
	const checker = program.getTypeChecker();
	let matching = 0;
	let identical = 0;
	/** @type {string[]} */
	const failures = [];
	/** @type {Map<string, string[]>} */
	const allowed = new Map();
	/** @type {string[]} */
	const reordered = [];

	for (const [target, schemaFile] of sourceOf) {
		const source = /** @type {ts.SourceFile} */ (program.getSourceFile(target));
		const committed = JSON.parse(fs.readFileSync(schemaFile, "utf8"));
		const name = path.relative(SCHEMAS_DIRECTORY, schemaFile);
		let generated;
		try {
			generated = walkSchema(typeScriptToSchema(source, checker), (node) =>
				typeof node.tsType === "string"
					? {
							...node,
							tsType: repointImports(
								node.tsType,
								path.dirname(target),
								path.dirname(schemaFile)
							)
						}
					: node
			);
		} catch (err) {
			failures.push(`${name}: ${/** @type {Error} */ (err).message}`);
			continue;
		}
		if (deepEqual(committed, generated)) {
			matching++;
			const text = await format(
				schemaFile,
				JSON.stringify(orderKeys(generated), null, 2)
			);
			if (text === fs.readFileSync(schemaFile, "utf8")) {
				identical++;
			} else {
				reordered.push(name);
			}
			if (write) writeFile(schemaFile, text);
			continue;
		}
		const left = allow(committed, strict ? [] : ALLOWANCES);
		const right = allow(generated, strict ? [] : ALLOWANCES);
		if (!deepEqual(left, right)) {
			const differences = findDifferences(left, right);
			failures.push(
				`${name}: ${differences.length} difference(s)\n${differences
					.map((difference) => `    ${difference}`)
					.join("\n")}`
			);
			continue;
		}
		// It round-trips: what differs is validation-neutral, and the allowance
		// each file needed is named below rather than counted against it.
		matching++;
		const needed = ALLOWANCES.filter((allowance) => {
			const rest = ALLOWANCES.filter((other) => other !== allowance);
			return !deepEqual(allow(committed, rest), allow(generated, rest));
		});
		for (const allowance of needed) {
			allowed.set(allowance.name, [
				...(allowed.get(allowance.name) || []),
				name
			]);
		}
	}

	console.log(
		`${matching} of ${sourceOf.size} schemas derive from ${path.relative(
			ROOT,
			TYPES_DIRECTORY
		)}, ${identical} byte for byte.`
	);
	if (reordered.length > 0) {
		console.log(
			`\n${reordered.length} round-trip but are written differently:`
		);
		for (const file of reordered) console.log(`  ${file}`);
	}
	for (const [allowance, files] of allowed) {
		console.log(`\n${files.length} differ only by ${allowance}:`);
		for (const file of files) console.log(`  ${file}`);
	}
	if (failures.length > 0) console.log("");
	for (const failure of failures) {
		console.log(`  ${failure}`);
	}
	if (verbose) {
		const sample = [...sourceOf.keys()][0];
		console.log(`\n--- ${path.relative(ROOT, sample)}\n${sources.get(sample)}`);
	}
	process.exitCode = failures.length > 0 ? 1 : 0;
};

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
