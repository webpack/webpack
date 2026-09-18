/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Derive every option schema from its TypeScript type, the direction
// `generate-types.js` runs in reverse. Each output has a committed schema to be
// judged against, which is what makes the round trip a measurement.
//
//   node tooling/generate-schemas.js             # round-trip report, writes nothing
//   node tooling/generate-schemas.js --bootstrap # schemas -> schemas/types/**.ts
//   node tooling/generate-schemas.js --write     # schemas/types/**.ts -> schemas
//   node tooling/generate-schemas.js --strict    # report what an allowance forgives
//
// WHY: the round-trip report is the point, not the writing. A source that has
// been written is read from `schemas/types`; one that has not is bootstrapped in
// memory from the committed schema, so a run measures all of them either way,
// rather than one migrated schema at a time.

const fs = require("fs");
const path = require("path");
const prettier = require("prettier");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const SCHEMAS_DIRECTORY = path.resolve(ROOT, "schemas");
const TYPES_DIRECTORY = path.resolve(ROOT, "schemas", "types");
const VOCABULARY_NAME = "vocabulary";

const bootstrap = process.argv.includes("--bootstrap");
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
	},
	{
		name: "NonEmptyArray",
		typeParameter: "T",
		underlying: "T[]",
		description: "An array holding at least one item.",
		constraints: { type: "array", minItems: 1 }
	},
	{
		name: "NonEmptyUniqueArray",
		typeParameter: "T",
		underlying: "T[]",
		description: "An array holding at least one item, all of them different.",
		constraints: { type: "array", minItems: 1, uniqueItems: true }
	},
	{
		name: "UniqueArray",
		typeParameter: "T",
		underlying: "T[]",
		description: "An array whose items are all different.",
		constraints: { type: "array", uniqueItems: true }
	},
	{
		name: "NonEmptyObject",
		typeParameter: "T",
		underlying: "{ [key: string]: T }",
		description: "An object holding at least one property.",
		constraints: { type: "object", minProperties: 1 }
	}
];

// Every keyword an alias may carry, which is also what a node must state none
// of beyond its own for that alias to be the right name for it.
const CONSTRAINT_KEYWORDS = [
	"minLength",
	"absolutePath",
	"pattern",
	"minimum",
	"minItems",
	"minProperties",
	"uniqueItems"
];

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
 * @param {string} text the description a schema keyword carries
 * @param {string[]} tags JSDoc tags to write below it
 * @returns {string} a JSDoc block, or the empty string when there is nothing to say
 */
const toJsDoc = (text, tags = []) => {
	const lines = [...(text ? [escapeComment(text)] : []), ...tags];
	if (lines.length === 0) return "";
	return `/**\n${lines.map((line) => ` * ${line}`).join("\n")}\n */\n`;
};

/**
 * @param {string} text prose a schema states
 * @returns {string} the same prose, with nothing in it closing the block
 */
const escapeComment = (text) => text.replace(/\*\//g, "*\\/");

/**
 * @param {string} text prose read back out of a comment
 * @returns {string} the same prose, as the schema states it
 */
const unescapeComment = (text) => text.replace(/\*\\\//g, "*/");

/**
 * The tags a schema node carries that are documentation rather than validation.
 * @param {Record<string, EXPECTED_ANY>} schema a schema node
 * @returns {string[]} the JSDoc tags it becomes
 */
const toDocumentationTags = (schema) => {
	/** @type {string[]} */
	const tags = [];
	if (typeof schema.added === "string") tags.push(`@since ${schema.added}`);
	if (schema.experimental) tags.push("@experimental");
	if (schema.deprecated) tags.push("@deprecated");
	if (schema.undefinedAsNull) tags.push("@undefinedAsNull");
	if (schema.cli && schema.cli.helper) tags.push("@cliHelper");
	if (schema.cli && schema.cli.exclude) tags.push("@cliExclude");
	if (Array.isArray(schema.implements)) {
		tags.push(`@implements ${schema.implements.join(", ")}`);
	}
	// WHY: a negated schema is the one thing TypeScript states no form of, so it
	// travels as what it is and the tag is the record that it had to.
	if (schema.not) tags.push(`@not ${JSON.stringify(schema.not)}`);
	// WHY: an object the schema types through `tsType` still states whether it is
	// open, and the type says nothing about that either way.
	if (schema.tsType && schema.additionalProperties === true) {
		tags.push("@additionalProperties");
	}
	// WHY: a name and a literal each say what they are, and neither carries the
	// type a schema validates beside it. The command line flags read that, so it
	// survives rather than being dropped as redundant.
	if (schema.type && (schema.$ref || schema.oneOf || schema.enum)) {
		tags.push(`@jsonType ${schema.type}`);
	}
	// WHY: a `tsType` with no `type` beside it validates nothing — it names what
	// the value is for a reader and lets anything through.
	if (schema.tsType && !schema.type && !schema.enum && !schema.instanceof) {
		tags.push("@typeOnly");
	}
	// WHY: where a shape is validated and typed as something else, the shape is
	// what the members say and the tag is the only place left for the type.
	if (statesShape(schema)) tags.push(`@tsType ${schema.tsType}`);
	if (!needsTag(schema)) return tags;
	const entry = /** @type {VocabularyEntry} */ (matchVocabulary(schema));
	for (const [keyword, value] of Object.entries(entry.constraints)) {
		if (keyword !== "type") tags.push(`@${keyword} ${value}`);
	}
	return tags;
};

/**
 * Whether the alias that carries this node's constraints would swallow a
 * description the node's own values need, leaving a tag as the only place.
 * @param {Record<string, EXPECTED_ANY>} schema a schema node
 * @returns {boolean} whether the constraints belong in a JSDoc tag instead
 */
const needsTag = (schema) =>
	hasConstraints(schema) &&
	Boolean(matchVocabulary(schema)) &&
	isObject(schema.additionalProperties) &&
	typeof schema.additionalProperties.description === "string";

/**
 * Whether the node's own keywords, rather than its `tsType`, are what the source
 * writes out — because that type would not read back as itself.
 * @param {Record<string, EXPECTED_ANY>} schema a schema node
 * @returns {boolean} whether the type belongs in a tag instead
 */
const statesShape = (schema) =>
	Boolean(schema.tsType) &&
	!schema.instanceof &&
	(Boolean(schema.properties) ||
		(Boolean(schema.type) && schema.type !== "object") ||
		(schema.type === "object" && schema.tsType.includes("|")));

/**
 * @param {Record<string, EXPECTED_ANY>} schema a schema node
 * @returns {VocabularyEntry | undefined} the alias that carries its constraints
 */
const matchVocabulary = (schema) =>
	VOCABULARY.find(
		(entry) =>
			Object.entries(entry.constraints).every(
				([keyword, value]) => schema[keyword] === value
			) &&
			CONSTRAINT_KEYWORDS.every(
				(keyword) =>
					schema[keyword] === undefined || keyword in entry.constraints
			)
	);

/**
 * Whether a node says anything a plain TypeScript type cannot, which is what
 * decides between an alias from the vocabulary and the bare type.
 * @param {Record<string, EXPECTED_ANY>} schema a schema node
 * @returns {boolean} whether it carries a validation-only keyword
 */
const hasConstraints = (schema) =>
	CONSTRAINT_KEYWORDS.some((keyword) => schema[keyword] !== undefined);

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
 * @param {unknown} value a value an `enum` lists
 * @returns {string} the TypeScript literal type for it
 */
const toLiteralType = (value) =>
	value === null ? "null" : JSON.stringify(value);

/**
 * Parenthesizes a branch that is itself a union, which is what keeps it one
 * branch: prettier preserves the parentheses, so the grouping survives.
 * @param {string} written the type syntax a branch became
 * @returns {string} that syntax, parenthesized where it has to be
 */
const group = (written) => (written.includes(" | ") ? `(${written})` : written);

/**
 * A union branch and an array's items are the two places a schema describes and
 * no JSDoc block reaches, so the description leads the type instead.
 * @param {Record<string, EXPECTED_ANY>} schema the node being written
 * @param {string} written the type syntax it became
 * @returns {string} that syntax, behind its description
 */
const describe = (schema, written) => {
	const tags = toDocumentationTags(schema);
	if (!schema.description && tags.length === 0) return written;
	const held = group(written);
	const said = [
		...(schema.description ? [escapeComment(schema.description)] : []),
		...tags
	].join(" ");
	return `/** ${said} */ ${held}`;
};

/**
 * @typedef {object} EmitContext
 * @property {{ text: string, name: string }[]} lifted declarations pulled out of a nested node
 * @property {Map<string, Set<string>>} imports names to import, keyed by module
 */

/**
 * Turns one schema node into TypeScript type syntax. A nested object carrying a
 * title becomes its own declaration and a reference to another schema becomes
 * an import, both of which the context collects.
 * @param {Record<string, EXPECTED_ANY>} schema the node to write
 * @param {EmitContext} collected what the node needs declared or imported
 * @returns {string} the type syntax
 */
const toTypeScriptType = (schema, collected) => {
	if (schema.$ref) {
		const { name, from } = readReference(schema.$ref);
		if (from !== "") {
			const names = collected.imports.get(from) || new Set();
			names.add(name);
			collected.imports.set(from, names);
		}
		return name;
	}
	// WHY: a `$ref` takes no siblings, so a reference that needs a description
	// is written as a `oneOf` of one — the only shape `oneOf` has in the corpus.
	if (schema.oneOf) return toTypeScriptType(schema.oneOf[0], collected);
	if (schema.anyOf) {
		return schema.anyOf
			.map((/** @type {Record<string, EXPECTED_ANY>} */ branch) =>
				describe(branch, group(toTypeScriptType(branch, collected)))
			)
			.join(" | ");
	}
	if (schema.instanceof === "RegExp") return "RegExp";
	// WHY: `instanceof: "Function"` always comes with the `tsType` naming what
	// the function is, and a callable type is how the checker reads it back. A
	// `tsType` beside an `enum` is the wider of the two, so it wins there too.
	if (schema.tsType && !statesShape(schema)) {
		return quoteImports(schema.tsType, '"');
	}
	if (schema.enum) {
		return schema.enum.map(toLiteralType).join(" | ");
	}
	const entry =
		hasConstraints(schema) && !needsTag(schema)
			? matchVocabulary(schema)
			: undefined;
	if (entry && entry.typeParameter === "") return entry.name;
	if (schema.type === "array") {
		const items = schema.items || {};
		const written = schema.items
			? describe(items, toTypeScriptType(items, collected))
			: "unknown";
		if (entry) return `${entry.name}<${written}>`;
		// WHY: prettier lifts a comment out of `T[]` and leaves it in front of the
		// whole array, where it reads as the array's own. `Array<T>` holds it.
		return items.description || written.includes(" ")
			? `Array<${written}>`
			: `${written}[]`;
	}
	if (schema.type === "object") {
		if (entry) {
			const values = isObject(schema.additionalProperties)
				? toTypeScriptType(schema.additionalProperties, collected)
				: "unknown";
			return `${entry.name}<${values}>`;
		}
		// WHY: an object with nothing in it and nothing allowed into it is an empty
		// type, where one that states nothing about its values is an index signature.
		if (!schema.properties && schema.additionalProperties === false) {
			return "{}";
		}
		if (!schema.properties && !isObject(schema.additionalProperties)) {
			const values = schema.additionalProperties === true ? "any" : "unknown";
			return `{ [key: string]: ${values} }`;
		}
		if (!schema.properties) return toMembers(schema, collected);
		// WHY: an object the schema titled is a type worth naming, and one it did
		// not is anonymous in TypeScript too, so both keep the shape they had.
		if (!schema.title) return toMembers(schema, collected);
		// WHY: TypeScript has no way to name a type without declaring one, so an
		// object the schema writes inline is lifted and marked to be put back.
		const tags = [...toDocumentationTags(schema), "@inline"];
		const documentation = toJsDoc(schema.description, tags);
		const body = toMembers(schema, collected);
		const text = body.includes("} & {")
			? `${documentation}export type ${schema.title} = ${body};`
			: `${documentation}export interface ${schema.title} ${body}`;
		collected.lifted.push({ name: schema.title, text });
		return schema.title;
	}
	if (schema.type === "string") return "string";
	if (schema.type === "number") return "number";
	if (schema.type === "boolean") return "boolean";
	return "unknown";
};

/**
 * A missing property is reported in the order `required` names them, so an
 * order the properties are not declared in has to be stated to be kept.
 * @param {Record<string, EXPECTED_ANY>} schema a schema node
 * @returns {string[]} the tag that states it, or nothing when it matches
 */
const toRequiredOrderTag = (schema) => {
	if (!Array.isArray(schema.required) || !schema.properties) return [];
	const declared = Object.keys(schema.properties).filter((name) =>
		schema.required.includes(name)
	);
	return declared.join(",") === schema.required.join(",")
		? []
		: [`@required ${schema.required.join(", ")}`];
};

/**
 * @param {Record<string, EXPECTED_ANY>} schema an object node holding properties
 * @param {EmitContext} collected what the node needs declared or imported
 * @returns {string} the members, braced, as an interface body or a type literal
 */
const toMembers = (schema, collected) => {
	const required = new Set(schema.required || []);
	const members = Object.entries(schema.properties || {}).map(
		([property, value]) => {
			const node = /** @type {Record<string, EXPECTED_ANY>} */ (value);
			const optional = required.has(property) ? "" : "?";
			const name = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(property)
				? property
				: JSON.stringify(property);
			const documentation = toJsDoc(
				node.description,
				toDocumentationTags(node)
			);
			return `${documentation}${name}${optional}: ${toTypeScriptType(
				node,
				collected
			)};`;
		}
	);
	if (schema.additionalProperties === true) {
		members.push("[key: string]: any;");
		return `{\n${members.join("\n")}\n}`;
	}
	if (!isObject(schema.additionalProperties)) {
		return `{\n${members.join("\n")}\n}`;
	}
	const values = /** @type {Record<string, EXPECTED_ANY>} */ (
		schema.additionalProperties
	);
	const documentation = toJsDoc(
		values.description,
		toDocumentationTags(values)
	);
	const index = `${documentation}[key: string]: ${toTypeScriptType(values, collected)};`;
	// WHY: TypeScript rejects a named property an index signature does not admit,
	// where a schema takes both, so the two halves meet as an intersection.
	if (members.length === 0) return `{\n${index}\n}`;
	return `{\n${members.join("\n")}\n} & {\n${index}\n}`;
};

/**
 * @param {Record<string, EXPECTED_ANY>} schema a definition, or the schema root
 * @param {string} name the name to declare it under
 * @param {boolean} isRoot whether it is the type the schema validates
 * @param {EmitContext} collected what the node needs declared or imported
 * @returns {string} the declaration
 */
const toDeclaration = (schema, name, isRoot, collected) => {
	const tags = [
		...toDocumentationTags(schema),
		...toRequiredOrderTag(schema),
		...(isRoot ? ["@schema"] : [])
	];
	const documentation = toJsDoc(schema.description, tags);
	if (schema.type === "object" && schema.properties) {
		const body = toMembers(schema, collected);
		return body.includes("} & {")
			? `${documentation}export type ${name} = ${body};`
			: `${documentation}export interface ${name} ${body}`;
	}
	return `${documentation}export type ${name} = ${toTypeScriptType(
		schema,
		collected
	)};`;
};

/**
 * Writes the TypeScript source a schema would be derived from. The output is
 * the migration's starting point, not a record of the schema: everything it
 * carries is ordinary TypeScript plus the aliases in the vocabulary.
 * @param {Record<string, EXPECTED_ANY>} schema the committed schema
 * @param {string} relativePath where the source lives, below the types directory
 * @returns {string} the source text
 */
const schemaToTypeScript = (schema, relativePath) => {
	/** @type {EmitContext} */
	const collected = { lifted: [], imports: new Map() };
	const definitions = Object.entries(schema.definitions || {}).map(
		([name, value]) =>
			toDeclaration(
				/** @type {Record<string, EXPECTED_ANY>} */ (value),
				name,
				false,
				collected
			)
	);
	const { definitions: _held, ...root } = schema;
	// WHY: a schema with no title of its own is a plain reference to a
	// definition of another one, which TypeScript already has a spelling for.
	// WHY: one holding nothing but definitions has no root to declare at all.
	const rootDeclarations = [];
	if (schema.title) {
		rootDeclarations.push(toDeclaration(root, schema.title, true, collected));
	} else if (root.$ref) {
		const { name, from } = readReference(root.$ref);
		rootDeclarations.push(
			`${toJsDoc("", ["@schema"])}export type { ${name} } from "${from}";`
		);
	}
	const body = [
		...definitions,
		...deduplicate(collected.lifted, schema.title),
		...rootDeclarations
	];
	const upwards = "../".repeat(relativePath.split("/").length - 1) || "./";
	const used = VOCABULARY.filter((entry) =>
		new RegExp(`\\b${entry.name}\\b`).test(body.join("\n"))
	);
	/** @type {string[]} */
	const imports = [];
	if (used.length > 0) {
		const names = used.map((entry) => `type ${entry.name}`).sort();
		imports.push(
			`import { ${names.join(", ")} } from "${upwards}${VOCABULARY_NAME}";`
		);
	}
	for (const [from, names] of collected.imports) {
		const inline = [...names].sort().map((name) => `type ${name}`);
		imports.push(`import { ${inline.join(", ")} } from "${from}";`);
	}
	const header = [
		"/*",
		"\tMIT License http://www.opensource.org/licenses/mit-license.php",
		"\tAuthor Alexander Akait @alexander-akait",
		"*/",
		"",
		"// The options this plugin takes. `tooling/generate-schemas.js` derives the",
		"// matching JSON schema from this file, so a change here is a change to what",
		"// webpack validates, to its types and to its command line flags alike."
	].join("\n");
	return [header, ...imports, ...body].join("\n\n");
};

/**
 * @param {{ text: string, name: string }[]} lifted declarations pulled out of nested nodes
 * @param {string | undefined} rootName the name the root is declared under
 * @returns {string[]} each declaration once, leaving out the root's own
 */
const deduplicate = (lifted, rootName) => {
	/** @type {Set<string>} */
	const seen = new Set();
	/** @type {string[]} */
	const kept = [];
	for (const one of lifted) {
		if (seen.has(one.name) || one.name === rootName) continue;
		seen.add(one.name);
		kept.push(one.text);
	}
	return kept;
};

/**
 * @returns {string} the source of the file the aliases are declared in
 */
const vocabularyToTypeScript = () => {
	const declarations = VOCABULARY.map((entry) => {
		const parameters = entry.typeParameter ? `<${entry.typeParameter}>` : "";
		const keywords = Object.entries(entry.constraints)
			.filter(([keyword]) => keyword !== "type")
			.map(([keyword, value]) => ` * @${keyword} ${value}`)
			.join("\n");
		return `/**\n * ${entry.description}\n${keywords}\n */\nexport type ${entry.name}${parameters} = ${entry.underlying};`;
	});
	const header = [
		"/*",
		"\tMIT License http://www.opensource.org/licenses/mit-license.php",
		"\tAuthor Alexander Akait @alexander-akait",
		"*/",
		"",
		"// The whole of what a JSON schema states and a TypeScript type cannot: each",
		"// alias is one combination of validation-only keywords, named. A source",
		"// writes the alias where it would write the underlying type, and nothing",
		"// here changes what that type means."
	].join("\n");
	return [header, ...declarations].join("\n\n");
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
const CONSTRAINT_TAGS = [
	"minLength",
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
 * @param {Set<string>} known the names declared in the same file
 * @returns {Record<string, EXPECTED_ANY>} the schema for the items
 */
const describedItems = (node, checker, known) => {
	const items = fromTypeNode(node, checker, known, 1);
	const held = ts.isUnionTypeNode(node) ? node.types[0] : node;
	const { description, tags } = readLeadingComment(held, 0, node.pos);
	const stated = fromDocumentationTags(tags);
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
const KNOWN_TAG_REGEXP =
	/@(since|experimental|deprecated|undefinedAsNull|cliHelper|cliExclude|implements|additionalProperties|typeOnly|tsType|jsonType|inline|not)(?:[ \t]+([^@]*))?/;

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
			.replace(/(=>|[(<:,])\s*\|\s*/g, "$1 "),
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
 * @param {Set<string>} known the names declared in the same file
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
						...wrapReference(described, carries)
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
		return {
			type: "array",
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
 * @param {Set<string>} known the names declared in the same file
 * @param {Record<string, EXPECTED_ANY>} head keywords the declaration itself carries
 * @returns {Record<string, EXPECTED_ANY>} the object schema they become
 */
const fromMembers = (members, checker, known, head) => {
	/** @type {Record<string, EXPECTED_ANY>} */
	const properties = {};
	/** @type {string[]} */
	const required = [];
	// WHY: `unknown` values are how a source says the schema states nothing about
	// them, which is not the same as stating that anything goes (`any`).
	/** @type {Record<string, EXPECTED_ANY> | boolean | undefined} */
	let additionalProperties = false;
	for (const member of members) {
		if (ts.isIndexSignatureDeclaration(member)) {
			const valueType = /** @type {ts.TypeNode} */ (member.type);
			if (valueType.kind === ts.SyntaxKind.AnyKeyword) {
				additionalProperties = true;
				continue;
			}
			if (valueType.kind === ts.SyntaxKind.UnknownKeyword) {
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
		const { description, tags } = readJsDoc(member);
		const value = fromTypeNode(member.type, checker, known);
		const stated = fromDocumentationTags(tags);
		const carries = description !== "" || Object.keys(stated).length > 0;
		properties[name] = applyTypeOnly({
			...(description ? { description } : {}),
			...stated,
			...wrapReference(value, carries)
		});
		if (!member.questionToken) required.push(name);
	}
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
	const known = new Set(
		declarations.map((declaration) =>
			/** @type {ts.InterfaceDeclaration} */ (declaration).name.getText()
		)
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
	let onDisk = 0;
	const vocabularyPath = path.resolve(TYPES_DIRECTORY, `${VOCABULARY_NAME}.ts`);
	sources.set(
		vocabularyPath,
		await format(vocabularyPath, vocabularyToTypeScript())
	);

	for (const schemaFile of schemaFiles) {
		const relative = path
			.relative(SCHEMAS_DIRECTORY, schemaFile)
			.replace(/\.json$/, ".ts")
			.split(path.sep)
			.join("/");
		const schema = JSON.parse(fs.readFileSync(schemaFile, "utf8"));
		const target = path.resolve(TYPES_DIRECTORY, relative);
		// WHY: a source that has been written is the one that counts. Bootstrapping
		// what has not is what lets a run report on all 39 before any is migrated.
		const written = !bootstrap && fs.existsSync(target);
		if (written) onDisk++;
		sources.set(
			target,
			written
				? fs.readFileSync(target, "utf8")
				: await format(
						target,
						repointImports(
							schemaToTypeScript(schema, relative),
							path.dirname(schemaFile),
							path.dirname(target)
						)
					)
		);
		sourceOf.set(target, schemaFile);
	}

	if (bootstrap) {
		let written = 0;
		for (const [target, text] of sources) {
			if (writeFile(target, text)) written++;
		}
		console.log(`${written} of ${sources.size} type declarations written.`);
		return;
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

	const from =
		onDisk === 0
			? "bootstrapped in memory"
			: `${onDisk} read from ${path.relative(ROOT, TYPES_DIRECTORY)}`;
	console.log(
		`${matching} of ${sourceOf.size} schemas round-trip, ${identical} byte for byte (${from}).`
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
