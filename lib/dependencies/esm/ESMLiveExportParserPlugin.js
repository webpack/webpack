/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const CompatibilityPlugin = require("../../javascript/CompatibilityPlugin");
const { harmonySpecifierTag } = require("./ESMImportDependencyParserPlugin");
const ESMLiveExportDependency = require("./ESMLiveExportDependency");

/**
 * @import {
 * 	AssignmentExpression,
 * 	Expression,
 * 	Identifier,
 * 	Node,
 * 	Pattern,
 * 	Property,
 * 	Program,
 * 	VariableDeclaration
 * } from "estree"
 */
/** @import JavascriptParser, { Range, WriteStatement } from "../../javascript/JavascriptParser" */

/**
 * The references of one name an exported module-level `let` declares, gathered
 * while the module is walked.
 * @typedef {object} LiveExportReferences
 * @property {string} name the declared name
 * @property {number} kindBase {@link ESMLiveExportDependency.KINDS_PER_NAME} times the name's index in its declaration
 * @property {number[]} occurrences the declaration's flat occurrence triples, shared by its names
 * @property {Set<number>} starts where each recorded occurrence starts
 * @property {number} varDeclarators the `var` declarators of the name the walk saw
 */

/**
 * Whether a value takes its name from the binding it is assigned to.
 * @param {Node | null | undefined} node the assigned value
 * @returns {boolean} true for an anonymous function or class
 */
const isAnonymousFunctionDefinition = (node) => {
	if (!node) return false;
	switch (node.type) {
		case "ArrowFunctionExpression":
			return true;
		case "FunctionExpression":
		case "ClassExpression":
			return !node.id;
		default:
			return false;
	}
};

/**
 * Finds the default a destructuring target gives an identifier, if any.
 * @param {Pattern | Property | null} pattern the destructuring target
 * @param {Identifier} identifier the identifier in it
 * @returns {Expression | undefined} the default value
 */
const findPatternDefault = (pattern, identifier) => {
	if (!pattern) return;
	switch (pattern.type) {
		case "AssignmentPattern":
			return pattern.left === identifier
				? pattern.right
				: findPatternDefault(pattern.left, identifier);
		case "ObjectPattern":
			for (const property of pattern.properties) {
				const found = findPatternDefault(
					property.type === "RestElement"
						? property.argument
						: /** @type {Pattern} */ (property.value),
					identifier
				);
				if (found) return found;
			}
			return;
		case "ArrayPattern":
			for (const element of pattern.elements) {
				const found = findPatternDefault(element, identifier);
				if (found) return found;
			}
			return;
		case "RestElement":
			return findPatternDefault(pattern.argument, identifier);
	}
};

const liveExportTag = Symbol("live export");

const PLUGIN_NAME = "ESMLiveExportParserPlugin";

/**
 * Records, for each module-level `let` an ESM module exports, the `let` keyword and
 * every reference to it, so a module library can move it to the chunk's scope.
 */
class ESMLiveExportParserPlugin {
	/**
	 * Applies the plugin by registering its hooks on the parser.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		/** @type {Program | undefined} */
		let program;
		/** @type {Map<string, VariableDeclaration> | undefined} */
		let topLevelDeclarations;
		// the module-level `var` declarators of each name, counted while pre-walked
		/** @type {Map<string, number> | undefined} */
		let varDeclarators;
		/** @type {Map<VariableDeclaration, LiveExportReferences[]> | undefined} */
		let declarations;
		// the last pattern identifier, which an `assign` or `write` call may follow
		/** @type {Identifier | undefined} */
		let pendingPattern;
		let pendingShorthand = false;
		// whether claimed declarations still wait for their tags
		let untagged = false;
		// a direct `eval` may read a binding by the name renaming takes away
		let usesEval = false;

		/**
		 * Finds the module-level `let` or `var` declaring a name, each declaration
		 * handed out once; a destructuring one, or a `var` a function shares, never is.
		 * @param {string} name declared name
		 * @returns {VariableDeclaration | undefined} the unclaimed declaration
		 */
		const claimTopLevelDeclaration = (name) => {
			if (topLevelDeclarations === undefined) {
				topLevelDeclarations = new Map();
				/** @type {Set<string>} */
				const functionNames = new Set();
				for (const statement of /** @type {Program} */ (program).body) {
					const declaration =
						statement.type === "ExportNamedDeclaration" ||
						statement.type === "ExportDefaultDeclaration"
							? statement.declaration
							: statement;
					if (!declaration) continue;
					if (
						(declaration.type === "FunctionDeclaration" ||
							declaration.type === "ClassDeclaration") &&
						declaration.id
					) {
						functionNames.add(declaration.id.name);
					}
					if (
						declaration.type !== "VariableDeclaration" ||
						(declaration.kind !== "let" && declaration.kind !== "var") ||
						declaration.declarations.some(
							(declarator) => declarator.id.type !== "Identifier"
						)
					) {
						continue;
					}
					for (const declarator of declaration.declarations) {
						const declared = /** @type {Identifier} */ (declarator.id).name;
						if (!topLevelDeclarations.has(declared)) {
							topLevelDeclarations.set(declared, declaration);
						}
					}
				}
				// a function declaration shares the `var` binding and keeps declaring it
				for (const functionName of functionNames) {
					topLevelDeclarations.delete(functionName);
				}
			}
			const declaration = topLevelDeclarations.get(name);
			if (declaration === undefined) return;
			for (const declarator of declaration.declarations) {
				topLevelDeclarations.delete(
					/** @type {Identifier} */ (declarator.id).name
				);
			}
			return declaration;
		};

		/**
		 * Records the keyword of a declaration once, so the template drops it.
		 * @param {LiveExportReferences} references a name the declaration declares
		 * @param {VariableDeclaration} declaration the declaration
		 */
		const recordKeyword = (references, declaration) => {
			const start = /** @type {Range} */ (declaration.range)[0];
			if (references.starts.has(start)) return;
			references.starts.add(start);
			references.occurrences.push(
				start,
				/** @type {Range} */ (declaration.declarations[0].range)[0],
				ESMLiveExportDependency.KEYWORD
			);
		};

		/**
		 * Records a reference once, however many hooks report it.
		 * @param {LiveExportReferences} references the name's references
		 * @param {Identifier} identifier the reference
		 * @param {boolean} shorthand whether it is a shorthand property
		 * @returns {boolean} true when it was not recorded before
		 */
		const record = (references, identifier, shorthand) => {
			const range = /** @type {Range} */ (identifier.range);
			if (references.starts.has(range[0])) return false;
			references.starts.add(range[0]);
			references.occurrences.push(
				range[0],
				range[1],
				references.kindBase +
					(shorthand
						? ESMLiveExportDependency.SHORTHAND
						: ESMLiveExportDependency.REFERENCE)
			);
			return true;
		};

		/**
		 * Records a value whose function or class name comes from the binding.
		 * @param {LiveExportReferences} references the name's references
		 * @param {Node | null | undefined} value the assigned value
		 */
		const recordNamed = (references, value) => {
			if (isAnonymousFunctionDefinition(value)) {
				const range = /** @type {Range} */ (/** @type {Node} */ (value).range);
				references.occurrences.push(
					range[0],
					range[1],
					references.kindBase + ESMLiveExportDependency.NAMED
				);
			}
		};

		/**
		 * Records the identifier a destructuring write just reported as a pattern.
		 * @param {Pattern} target the destructuring target containing it
		 * @returns {boolean} true when it belonged to the tagged name
		 */
		const recordPendingPattern = (target) => {
			const references = /** @type {LiveExportReferences} */ (
				parser.currentTagData
			);
			const identifier = pendingPattern;
			pendingPattern = undefined;
			if (identifier === undefined || identifier.name !== references.name) {
				return false;
			}
			if (!references.starts.has(/** @type {Range} */ (identifier.range)[0])) {
				recordNamed(references, findPatternDefault(target, identifier));
			}
			record(references, identifier, pendingShorthand);
			return true;
		};

		parser.hooks.program.tap(PLUGIN_NAME, (ast) => {
			program = ast;
			topLevelDeclarations = undefined;
			varDeclarators = undefined;
			declarations = undefined;
			pendingPattern = undefined;
			untagged = false;
			usesEval = false;
		});

		parser.hooks.call.for("eval").tap(PLUGIN_NAME, () => {
			usesEval = true;
		});

		// Counted before anything is claimed: a `var` the walk does not report as a
		// declarator, such as `var x = y` renaming `y`, keeps its name in the module.
		parser.hooks.preDeclarator.tap(
			{ name: PLUGIN_NAME, stage: -100 },
			(declarator, statement) => {
				if (statement.kind !== "var" || parser.scope.topLevelScope !== true) {
					return;
				}
				if (varDeclarators === undefined) varDeclarators = new Map();
				if (declarator.id.type === "Identifier") {
					const name = declarator.id.name;
					varDeclarators.set(name, (varDeclarators.get(name) || 0) + 1);
				} else {
					// a destructured `var` is never hoisted, so its names count once more
					parser.enterPattern(declarator.id, (name) => {
						const map = /** @type {Map<string, number>} */ (varDeclarators);
						map.set(name, (map.get(name) || 0) + 1);
					});
				}
			}
		);

		// Runs before the export plugin, whose tap ends the hook.
		parser.hooks.exportSpecifier.tap(
			{ name: PLUGIN_NAME, stage: -10 },
			(statement, id) => {
				if (
					parser.getTagData(id, harmonySpecifierTag) ||
					parser.getTagData(id, CompatibilityPlugin.nestedWebpackIdentifierTag)
				) {
					return;
				}
				const declaration = claimTopLevelDeclaration(id);
				if (declaration === undefined) return;
				/** @type {LiveExportReferences[]} */
				const names = [];
				/** @type {number[]} */
				const occurrences = [];
				/** @type {Set<number>} */
				const starts = new Set();
				for (const declarator of declaration.declarations) {
					const identifier = /** @type {Identifier} */ (declarator.id);
					/** @type {LiveExportReferences} */
					const references = {
						name: identifier.name,
						kindBase: names.length * ESMLiveExportDependency.KINDS_PER_NAME,
						occurrences,
						starts,
						varDeclarators: 0
					};
					if (record(references, identifier, false)) {
						recordNamed(references, declarator.init);
					}
					names.push(references);
				}
				recordKeyword(names[0], declaration);
				if (declarations === undefined) declarations = new Map();
				declarations.set(declaration, names);
				untagged = true;
			}
		);

		// Tagged once the walk starts: the pre-walks may still redefine the name,
		// as the inner graph does for a declaration without an initializer.
		parser.hooks.statement.tap(PLUGIN_NAME, () => {
			if (!untagged) return;
			untagged = false;
			for (const names of /** @type {NonNullable<typeof declarations>} */ (
				declarations
			).values()) {
				for (const references of names) {
					parser.tagVariable(references.name, liveExportTag, references);
				}
			}
		});

		// Each `var` declaring a hoisted name loses its keyword; one also declaring
		// another name leaves that name in the module, so it stays uncounted.
		parser.hooks.declarator.tap(
			{ name: PLUGIN_NAME, stage: -100 },
			(declarator, statement) => {
				if (
					statement.type !== "VariableDeclaration" ||
					statement.kind !== "var" ||
					declarator.id.type !== "Identifier"
				) {
					return;
				}
				const references = /** @type {LiveExportReferences | undefined} */ (
					parser.getTagData(declarator.id.name, liveExportTag)
				);
				if (references === undefined) return;
				const sharesDeclaration = statement.declarations.every(
					(other) =>
						other.id.type === "Identifier" &&
						/** @type {LiveExportReferences | undefined} */ (
							parser.getTagData(other.id.name, liveExportTag)
						) !== undefined &&
						/** @type {LiveExportReferences} */ (
							parser.getTagData(other.id.name, liveExportTag)
						).occurrences === references.occurrences
				);
				if (!sharesDeclaration) return;
				references.varDeclarators++;
				recordKeyword(references, statement);
				if (record(references, declarator.id, false)) {
					recordNamed(references, declarator.init);
				}
			}
		);

		parser.hooks.expression
			.for(liveExportTag)
			.tap(PLUGIN_NAME, (expression) => {
				if (expression.type !== "Identifier") return;
				record(
					/** @type {LiveExportReferences} */ (parser.currentTagData),
					expression,
					parser.scope.inShorthand === expression.name
				);
			});

		parser.hooks.pattern.for(liveExportTag).tap(PLUGIN_NAME, (pattern) => {
			pendingPattern = pattern;
			pendingShorthand = parser.scope.inShorthand === pattern.name;
		});

		parser.hooks.assign.for(liveExportTag).tap(
			PLUGIN_NAME,
			/**
			 * Records an assigned name; a destructuring target is claimed here, so the
			 * parser keeps it bound to the module-level `let` afterwards.
			 * @param {AssignmentExpression} expression the assignment
			 * @returns {true | void} true for a destructuring target
			 */
			(expression) => {
				const references = /** @type {LiveExportReferences} */ (
					parser.currentTagData
				);
				if (expression.left.type === "Identifier") {
					// a compound assignment such as `+=` names nothing
					if (
						expression.operator === "=" ||
						expression.operator === "||=" ||
						expression.operator === "&&=" ||
						expression.operator === "??="
					) {
						recordNamed(references, expression.right);
					}
					record(references, expression.left, false);
					return;
				}
				if (recordPendingPattern(expression.left)) return true;
			}
		);

		parser.hooks.write.for(liveExportTag).tap(
			PLUGIN_NAME,
			/**
			 * Records a name an update or a loop binding writes.
			 * @param {WriteStatement} node the writing construct
			 */
			(node) => {
				const references = /** @type {LiveExportReferences} */ (
					parser.currentTagData
				);
				const target =
					node.type === "UpdateExpression" ? node.argument : node.left;
				if (target.type === "Identifier") {
					record(references, target, false);
				} else {
					recordPendingPattern(/** @type {Pattern} */ (target));
				}
			}
		);

		parser.hooks.finish.tap(PLUGIN_NAME, () => {
			const claimed = declarations;
			// The parser outlives the module, so its tree is let go here.
			program = undefined;
			topLevelDeclarations = undefined;
			declarations = undefined;
			pendingPattern = undefined;
			const counted = varDeclarators;
			varDeclarators = undefined;
			if (claimed === undefined) return;
			for (const [declaration, names] of claimed) {
				// A name redefined while the module was walked, or a `var` of it the walk
				// did not see, left occurrences unrecorded.
				if (
					names.some(
						(references) =>
							parser.getTagData(references.name, liveExportTag) !==
								references ||
							(declaration.kind === "var" &&
								references.varDeclarators !==
									/** @type {Map<string, number>} */ (counted).get(
										references.name
									))
					)
				) {
					continue;
				}
				parser.state.current.addDependency(
					new ESMLiveExportDependency(
						names.map((references) => references.name),
						// a copy holds no spare capacity from the pushes
						[...names[0].occurrences],
						usesEval
					)
				);
			}
		});
	}
}

module.exports = ESMLiveExportParserPlugin;
