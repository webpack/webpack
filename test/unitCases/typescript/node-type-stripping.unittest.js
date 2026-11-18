"use strict";

const fs = require("fs");
const path = require("path");
const { parser } = require("../../../lib/javascript/syntax");
const {
	blankTypeScript
} = require("../../../lib/typescript/blankTypeScript");
const { fixture } = require("../../helpers/fixture");
const { plain } = require("../../helpers/javascriptParse");

const DIR = path.join(__dirname, "../../fixtures/typescript");
const NAMES = fs
	.readdirSync(DIR)
	.filter(
		(name) =>
			fs.existsSync(path.join(DIR, name, "index.ts")) ||
			fs.existsSync(path.join(DIR, name, "fixture.js"))
	)
	.sort();

/**
 * Node.js's type stripping, which webpack's `typescript` option skips what
 * it removes; absent before Node.js 22.13.
 * @type {((code: string) => string) | undefined}
 */
const stripTypeScriptTypes =
	// Deno and Bun have the API too, with errors of their own
	process.versions.deno === undefined && process.versions.bun === undefined
		? /** @type {{ stripTypeScriptTypes?: (code: string) => string }} */ (
				require("module")
			).stripTypeScriptTypes
		: undefined;

/**
 * @typedef {object} Read
 * @property {Record<string, unknown>=} tree the program as plain ESTree data
 * @property {string=} code the first parse error's code, where the parse refuses
 */

/**
 * @param {string} source what to parse, as a module
 * @param {boolean} typescript whether TypeScript's syntax is skipped
 * @param {number[]=} typeRanges where the skipped syntax is collected
 * @returns {Read} the tree, or the code of the first error
 */
const read = (source, typescript, typeRanges) => {
	/** @type {string | undefined} */
	let code;
	const program = parser.parseProgram(source, 0, {
		typescript,
		typeRanges,
		parseError: (input, errorCode) => {
			if (code === undefined) code = errorCode;
		}
	});
	if (program === undefined || code !== undefined) return { code };
	return {
		tree: /** @type {Record<string, unknown>} */ (
			plain(parser.toEstreeObject(program))
		)
	};
};

/**
 * A tree as one line: each node's type and start, then its scalar fields
 * and its children by key.
 * @param {unknown} value a plain node, a list of them or a scalar
 * @returns {string} its text
 */
const treeText = (value) => {
	if (Array.isArray(value)) return `[${value.map(treeText).join(",")}]`;
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	const node = /** @type {Record<string, unknown>} */ (value);
	if (typeof node.type !== "string") return JSON.stringify(node);
	/** @type {string[]} */
	const fields = [];
	for (const key of Object.keys(node)) {
		if (["type", "start", "end"].includes(key)) continue;
		fields.push(`${key}=${treeText(node[key])}`);
	}
	return `${node.type}[${node.start},${node.end}](${fields.join(" ")})`;
};

/**
 * @param {unknown} value a plain tree
 * @param {(node: Record<string, unknown>) => void} visit called on each node
 * @returns {void}
 */
const eachNode = (value, visit) => {
	if (Array.isArray(value)) {
		for (const item of value) eachNode(item, visit);
	} else if (value !== null && typeof value === "object") {
		const node = /** @type {Record<string, unknown>} */ (value);
		if (typeof node.type === "string") visit(node);
		for (const key of Object.keys(node)) eachNode(node[key], visit);
	}
};

/**
 * The tree parsed from Node.js's output, where it wrote a `;` the source
 * does not have there (at an ASI hazard after a skipped statement, or after
 * an assertion): those empty statements, absent from ours, are dropped, and
 * a statement ending at such a `;` ends where ours does, so ends are not
 * compared.
 * @param {string} source the TypeScript source
 * @param {string} stripped Node.js's output
 * @param {Record<string, unknown>} expected the tree of Node.js's output
 * @param {Record<string, unknown>} actual our tree
 * @returns {[unknown, unknown]} the two trees to compare
 */
const comparable = (source, stripped, expected, actual) => {
	/** @type {Set<unknown>} */
	const ours = new Set();
	eachNode(actual, (node) => {
		if (node.type === "EmptyStatement") ours.add(node.start);
	});
	let written = false;
	for (let i = 0; i < source.length; i++) {
		if (stripped[i] !== source[i] && /\S/.test(stripped[i])) written = true;
	}
	/**
	 * @param {string} key a field
	 * @param {unknown} value its value
	 * @returns {unknown} the value compared
	 */
	const replacer = (key, value) => {
		if (written && key === "end") return undefined;
		if (!Array.isArray(value)) return value;
		return value.filter(
			(item) =>
				!(
					item !== null &&
					typeof item === "object" &&
					/** @type {Record<string, unknown>} */ (item).type ===
						"EmptyStatement" &&
					!ours.has(/** @type {Record<string, unknown>} */ (item).start)
				)
		);
	};
	// a dropped empty statement moves the end of the one before it
	if (JSON.stringify(expected) !== JSON.stringify(expected, replacer)) {
		written = true;
	}
	return [
		JSON.parse(JSON.stringify(expected, replacer)),
		JSON.parse(JSON.stringify(actual, replacer))
	];
};

/** @typedef {{ relation: string, contains: string, why: string }} KnownDifference a difference from Node.js a fixture's `expected.json` names */

/**
 * @param {string} name a fixture
 * @returns {KnownDifference | undefined} how it is known to differ from Node.js, from its `expected.json`
 */
const knownDifference = (name) => {
	const file = path.join(DIR, name, "expected.json");
	if (!fs.existsSync(file)) return undefined;
	/** @type {KnownDifference[]} */
	const entries = JSON.parse(fs.readFileSync(file, "utf8"));
	return entries.find((item) => item.relation === "node");
};

describe("TypeScript fixtures", () => {
	for (const name of NAMES) {
		describe(name, () => {
			const source = fixture("typescript", name);

			it("blanks into the JavaScript its tree reads", () => {
				/** @type {number[]} */
				const typeRanges = [];
				const actual = read(source, true, typeRanges);
				if (actual.tree === undefined) return;
				const blanked = blankTypeScript(source, typeRanges);
				expect(blanked).toHaveLength(source.length);
				const expected = read(blanked, false);
				expect(expected.code).toBeUndefined();
				const [left, right] = comparable(
					source,
					blanked,
					/** @type {Record<string, unknown>} */ (expected.tree),
					actual.tree
				);
				expect(treeText(right)).toBe(treeText(left));
			});

			it("parses into the tree the snapshot holds", () => {
				const { tree, code } = read(source, true);
				expect(tree ? treeText(tree) : `refuses: ${code}`).toMatchSnapshot();
			});

			(stripTypeScriptTypes === undefined ? it.skip : it)(
				"is read as Node.js strips it",
				() => {
					const strip = /** @type {(code: string) => string} */ (
						stripTypeScriptTypes
					);
					const actual = read(source, true);
					/** @type {string | undefined} */
					let stripped;
					/** @type {string | undefined} */
					let refusal;
					try {
						stripped = strip(source);
					} catch (error) {
						refusal = /** @type {{ code: string }} */ (error).code;
					}
					/** @type {string | undefined} */
					let difference;
					// both trees as text, where they differ
					let expectedText = "";
					let actualText = "";
					if (refusal !== undefined) {
						// syntax Node.js reads but does not strip is refused as such
						if (actual.code === undefined) {
							difference = `Node.js refuses it (${refusal})`;
						} else if (
							(refusal === "ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX") !==
							(actual.code === "unsupported-typescript-syntax")
						) {
							difference = `refused as ${actual.code}, Node.js as ${refusal}`;
						}
					} else {
						const expected = read(/** @type {string} */ (stripped), false);
						if (expected.tree === undefined) {
							difference = `Node.js writes no JavaScript (${expected.code})`;
						} else if (actual.tree === undefined) {
							difference = `refused (${actual.code})`;
						} else {
							const [left, right] = comparable(
								source,
								/** @type {string} */ (stripped),
								expected.tree,
								actual.tree
							);
							expectedText = treeText(left);
							actualText = treeText(right);
							if (expectedText !== actualText) {
								difference = "the trees differ";
							}
						}
					}
					const known = knownDifference(name);
					if (known === undefined) {
						expect(actualText).toBe(expectedText);
						expect(difference).toBeUndefined();
					} else {
						// a difference that went away leaves its entry stale
						// the difference it names, which a stale entry no longer shows
						expect(difference).toContain(known.contains);
					}
				}
			);
		});
	}

	it("reads JavaScript the same with the option as without it", () => {
		const source = fixture("typescript", "plain-javascript");
		expect(read(source, true)).toEqual(read(source, false));
	});

	it("refuses TypeScript without the option", () => {
		expect(read(fixture("typescript", "interfaces"), false).code).toBe(
			"unexpected-reserved-word"
		);
		expect(
			read(fixture("typescript", "variable-annotations"), false).code
		).toBe("unexpected-token");
	});
});
