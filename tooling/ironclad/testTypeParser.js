/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/**
 * Test-support parser: espree plus a hand-written `parserServices`, so the
 * rule's type-aware path can be exercised without typescript-eslint.
 *
 * Types are declared per identifier name through `parserOptions.types`, as
 * `"number"` or `"Name"` or `"Name:Base1,Base2"`.
 *
 * `parserOptions.modules` maps a file name to its source and builds a real
 * TypeScript program over it, so cross-module contracts are read from real
 * declarations. Only the ESTree-to-TypeScript node mapping is stubbed — that
 * part belongs to typescript-eslint, not to this rule.
 */

const espree = require("espree");
const typescript = require("typescript");

/** @typedef {import("estree").Node} Node */
/** @typedef {import("estree").Program} Program */
/** @typedef {import("typescript").Type} Type */

const PRIMITIVE_FLAGS = new Map([
	["bigint", typescript.TypeFlags.BigInt],
	["boolean", typescript.TypeFlags.Boolean],
	["null", typescript.TypeFlags.Null],
	["number", typescript.TypeFlags.Number],
	["string", typescript.TypeFlags.String],
	["symbol", typescript.TypeFlags.ESSymbol],
	["undefined", typescript.TypeFlags.Undefined]
]);

/**
 * @param {string} descriptor `"number"`, `"Name"` or `"Name:Base1,Base2"`
 * @returns {Type} a type answering what the rule asks of it
 */
const makeType = (descriptor) => {
	const primitive = PRIMITIVE_FLAGS.get(descriptor);
	const [name, bases] = descriptor.split(":");
	const baseTypes = bases ? bases.split(",").map(makeType) : [];
	return /** @type {Type} */ (
		/** @type {unknown} */ ({
			flags: primitive === undefined ? typescript.TypeFlags.Object : primitive,
			baseTypes,
			isUnion: () => false,
			isClassOrInterface: () => primitive === undefined,
			getSymbol: () =>
				primitive === undefined ? { getName: () => name } : undefined
		})
	);
};

/** @type {Map<string, import("typescript").Program>} */
const programs = new Map();

/**
 * @param {Record<string, string>} modules file name to source
 * @returns {import("typescript").Program} a program over those files
 */
const programFor = (modules) => {
	const key = JSON.stringify(modules);
	const cached = programs.get(key);
	if (cached) return cached;
	const options = {
		allowJs: true,
		checkJs: true,
		noEmit: true,
		target: typescript.ScriptTarget.ES2022
	};
	const sources = new Map(
		Object.entries(modules).map(([name, text]) => [
			name,
			typescript.createSourceFile(name, text, options.target, true)
		])
	);
	/** @type {import("typescript").CompilerHost} */
	const host = {
		fileExists: (/** @type {string} */ name) => sources.has(name),
		getCanonicalFileName: (/** @type {string} */ name) => name,
		getCurrentDirectory: () => "",
		getDefaultLibFileName: () => "lib.d.ts",
		getNewLine: () => "\n",
		getSourceFile: (/** @type {string} */ name) => sources.get(name),
		readFile: (/** @type {string} */ name) => modules[name],
		useCaseSensitiveFileNames: () => true,
		writeFile: () => {}
	};
	const program = typescript.createProgram([...sources.keys()], options, host);
	programs.set(key, program);
	return program;
};

/**
 * Finds the declaration a call resolves to, by name. typescript-eslint does
 * this through its node maps; the test only needs the answer.
 * @param {import("typescript").Program} program program to search
 * @param {string} name identifier being called
 * @returns {import("typescript").Symbol | undefined} its symbol
 */
const symbolNamed = (program, name) => {
	const checker = program.getTypeChecker();
	for (const sourceFile of program.getSourceFiles()) {
		for (const statement of sourceFile.statements) {
			if (
				typescript.isFunctionDeclaration(statement) &&
				statement.name &&
				statement.name.text === name
			) {
				return checker.getSymbolAtLocation(statement.name);
			}
			if (typescript.isVariableStatement(statement)) {
				for (const declaration of statement.declarationList.declarations) {
					if (
						typescript.isIdentifier(declaration.name) &&
						declaration.name.text === name
					) {
						return checker.getSymbolAtLocation(declaration.name);
					}
				}
			}
		}
	}
	return undefined;
};

/**
 * @param {string} code source to parse
 * @param {{ types?: Record<string, string>, modules?: Record<string, string>, ecmaVersion?: number | "latest", sourceType?: "script" | "module" }} options parser options
 * @returns {{ ast: Program, services: object }} parse result
 */
const parseForESLint = (code, options) => {
	const declared = (options && options.types) || {};
	const modules = options && options.modules;
	const program = modules ? programFor(modules) : null;
	const ast = espree.parse(code, {
		comment: true,
		ecmaVersion: (options && options.ecmaVersion) || "latest",
		loc: true,
		range: true,
		sourceType: (options && options.sourceType) || "script",
		tokens: true
	});
	const checker = {
		/**
		 * @param {Type} type type to look under
		 * @returns {Type[]} its base types
		 */
		getBaseTypes: (type) =>
			/** @type {{ baseTypes: Type[] }} */ (/** @type {unknown} */ (type))
				.baseTypes
	};
	return {
		ast: /** @type {Program} */ (/** @type {unknown} */ (ast)),
		services: {
			program: program || { getTypeChecker: () => checker },
			/**
			 * @param {Node} node node to resolve
			 * @returns {import("typescript").Symbol | undefined} its symbol
			 */
			getSymbolAtLocation(node) {
				if (!program || node.type !== "Identifier") return undefined;
				return symbolNamed(program, node.name);
			},
			/**
			 * @param {Node} node node to type
			 * @returns {Type} its declared type
			 */
			getTypeAtLocation(node) {
				const name = node.type === "Identifier" ? node.name : "";
				const descriptor = Object.prototype.hasOwnProperty.call(declared, name)
					? declared[name]
					: null;
				if (descriptor === null) throw new Error(`no type for ${name}`);
				return makeType(descriptor);
			}
		}
	};
};

module.exports = { parseForESLint };
