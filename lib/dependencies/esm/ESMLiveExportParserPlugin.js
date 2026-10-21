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
 * 	ClassDeclaration,
 * 	Expression,
 * 	ForInStatement,
 * 	ForOfStatement,
 * 	FunctionDeclaration,
 * 	Identifier,
 * 	MaybeNamedClassDeclaration,
 * 	MaybeNamedFunctionDeclaration,
 * 	Node,
 * 	Pattern,
 * 	Property,
 * 	Program,
 * 	VariableDeclaration,
 * 	VariableDeclarator
 * } from "estree"
 */
/** @import JavascriptParser, { Range, WriteStatement } from "../../javascript/JavascriptParser" */
/** @import NormalModule from "../../module/NormalModule" */

/**
 * A module-level declaration an export may name: a `let` or `var` statement, or a
 * function or class, whose binding stays declared where it is.
 * @typedef {VariableDeclaration | FunctionDeclaration | ClassDeclaration | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration} LiveDeclaration
 */

/**
 * The occurrences of the names one claimed declaration binds, gathered while the
 * module is walked.
 * @typedef {object} LiveExportGroup
 * @property {LiveDeclaration} declaration the claimed declaration
 * @property {LiveExportReferences[]} names one entry per name it binds
 * @property {number[]} occurrences flat triples of the occurrences renaming takes, of all its names
 * @property {Set<number>} starts where each of those starts
 * @property {number[]} mirrors flat triples of where the module mirrors a write instead, of all its names
 * @property {Set<string>} mirrorKeys where each of those starts, with its name and kind
 * @property {boolean} written whether anything but its declaration assigns a name, the only way its copy can go stale
 * @property {boolean} declared whether the walk saw each `let` or `const` declarator, which a mirroring module needs
 * @property {number} lexicalStart where a `let` or class declaration starts, before which a use throws; -1 for others
 * @property {boolean} earlyUse whether the module uses a `let` or class above its declaration, where it must throw
 */

/**
 * The occurrences of one name of a claimed declaration.
 * @typedef {object} LiveExportReferences
 * @property {string} name the declared name
 * @property {number} kindBase {@link ESMLiveExportDependency.KINDS_PER_NAME} times the name's index in its group
 * @property {LiveExportGroup} group the group it belongs to
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
 * Calls back with each identifier a binding pattern declares or assigns.
 * @param {Pattern | null} pattern the pattern
 * @param {(identifier: Identifier, shorthand: boolean, value: Expression | undefined) => void} callback with the identifier, whether a shorthand property holds it, and its default
 * @returns {void}
 */
const forEachPatternIdentifier = (pattern, callback) => {
	if (!pattern) return;
	switch (pattern.type) {
		case "Identifier":
			callback(pattern, false, undefined);
			return;
		case "AssignmentPattern":
			if (pattern.left.type === "Identifier") {
				callback(pattern.left, false, pattern.right);
			} else {
				forEachPatternIdentifier(pattern.left, callback);
			}
			return;
		case "ObjectPattern":
			for (const property of pattern.properties) {
				if (property.type === "RestElement") {
					forEachPatternIdentifier(property.argument, callback);
				} else if (property.shorthand && property.value.type === "Identifier") {
					callback(property.value, true, undefined);
				} else if (
					property.shorthand &&
					property.value.type === "AssignmentPattern" &&
					property.value.left.type === "Identifier"
				) {
					callback(property.value.left, true, property.value.right);
				} else {
					forEachPatternIdentifier(property.value, callback);
				}
			}
			return;
		case "ArrayPattern":
			for (const element of pattern.elements) {
				forEachPatternIdentifier(element, callback);
			}
			return;
		case "RestElement":
			forEachPatternIdentifier(pattern.argument, callback);
	}
};

/**
 * The names the declarators of a declaration bind.
 * @param {VariableDeclarator[]} declarators the declarators
 * @returns {string[]} their names
 */
const declaredNames = (declarators) => {
	/** @type {string[]} */
	const names = [];
	for (const declarator of declarators) {
		forEachPatternIdentifier(declarator.id, (identifier) => {
			names.push(identifier.name);
		});
	}
	return names;
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
					property.type === "RestElement" ? property.argument : property.value,
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
 * Records, for each module-level binding an ESM module exports, every occurrence
 * renaming it takes, so a module library can move the binding to the chunk's scope,
 * and every write, where a module keeping its declaration mirrors it there instead.
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
		/** @type {Map<string, LiveDeclaration> | undefined} */
		let claimable;
		// the module-level `var` declarators of each name, counted while pre-walked
		/** @type {Map<string, number> | undefined} */
		let varDeclarators;
		// module-level `var` names linked through a statement declaring them together
		/** @type {Map<string, string> | undefined} */
		let varLinks;
		/** @type {LiveExportGroup[] | undefined} */
		let groups;
		// the last pattern identifier, which an `assign` or `write` call may follow
		/** @type {Identifier | undefined} */
		let pendingPattern;
		let pendingShorthand = false;
		// whether claimed declarations still wait for their tags
		let untagged = false;
		// a direct `eval` may read a binding by the name renaming takes away
		let usesEval = false;
		// flat pairs of where each direct `eval` call starts and ends, as it may write
		/** @type {number[]} */
		let evalCalls = [];
		// A hot update replaces the module where the chunk's scope is not, so the
		// module keeps its declarations and mirrors them, `const` included.
		let hot = false;

		/**
		 * The name standing for every `var` name linked to this one.
		 * @param {string} name a `var` name
		 * @returns {string} the representative
		 */
		const findVarLink = (name) => {
			const links = /** @type {Map<string, string>} */ (varLinks);
			let current = name;
			let next = links.get(current);
			while (next !== undefined && next !== current) {
				current = next;
				next = links.get(current);
			}
			return current;
		};

		/**
		 * Indexes the module-level declarations an export may claim, by each name.
		 * @returns {Map<string, LiveDeclaration>} the declarations
		 */
		const getClaimable = () => {
			if (claimable !== undefined) return claimable;
			claimable = new Map();
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
					claimable.set(
						declaration.id.name,
						/** @type {LiveDeclaration} */ (declaration)
					);
				} else if (
					declaration.type === "VariableDeclaration" &&
					(declaration.kind === "let" ||
						declaration.kind === "var" ||
						(hot && declaration.kind === "const"))
				) {
					for (const name of declaredNames(declaration.declarations)) {
						if (!claimable.has(name)) claimable.set(name, declaration);
					}
				}
			}
			return claimable;
		};

		/**
		 * Records an occurrence once, however many hooks report it.
		 * @param {LiveExportReferences} references the name
		 * @param {number} start where it starts
		 * @param {number} end where it ends
		 * @param {number} kind an occurrence kind of {@link ESMLiveExportDependency}
		 * @returns {boolean} true when it was not recorded before
		 */
		const recordOccurrence = (references, start, end, kind) => {
			const { group } = references;
			const code = references.kindBase + kind;
			if (kind >= ESMLiveExportDependency.SYNC) {
				// one write may mirror several names at the same place
				const key = `${start}:${code}`;
				if (group.mirrorKeys.has(key)) return false;
				group.mirrorKeys.add(key);
				group.mirrors.push(start, end, code);
				return true;
			}
			if (group.starts.has(start)) return false;
			group.starts.add(start);
			group.occurrences.push(start, end, code);
			return true;
		};

		/**
		 * Records a reference, and the anonymous function or class it names.
		 * @param {LiveExportReferences} references the name
		 * @param {Identifier} identifier the reference
		 * @param {boolean} shorthand whether a shorthand property holds it
		 * @param {Node | null | undefined} value what it is assigned, if anything
		 */
		const record = (references, identifier, shorthand, value) => {
			const range = /** @type {Range} */ (identifier.range);
			if (range[0] < references.group.lexicalStart) {
				references.group.earlyUse = true;
			}
			if (
				recordOccurrence(
					references,
					range[0],
					range[1],
					shorthand
						? ESMLiveExportDependency.SHORTHAND
						: ESMLiveExportDependency.REFERENCE
				) &&
				isAnonymousFunctionDefinition(value)
			) {
				const valueRange = /** @type {Range} */ (
					/** @type {Node} */ (value).range
				);
				recordOccurrence(
					references,
					valueRange[0],
					valueRange[1],
					ESMLiveExportDependency.NAMED
				);
			}
		};

		/**
		 * Records the names, keyword and parentheses of a variable declaration, when
		 * every name it declares belongs to one group.
		 * @param {VariableDeclaration} declaration the declaration
		 * @param {(name: string) => LiveExportReferences | undefined} lookup the group's entry for a name
		 * @returns {LiveExportReferences[] | undefined} the entries of its names, in order
		 */
		const recordDeclaration = (declaration, lookup) => {
			/** @type {LiveExportReferences[]} */
			const entries = [];
			/** @type {LiveExportGroup | undefined} */
			let group;
			for (const name of declaredNames(declaration.declarations)) {
				const references = lookup(name);
				if (
					references === undefined ||
					(group !== undefined && references.group !== group)
				) {
					return;
				}
				group = references.group;
				entries.push(references);
			}
			if (entries.length === 0) return;
			recordOccurrence(
				entries[0],
				/** @type {Range} */ (declaration.range)[0],
				/** @type {Range} */ (declaration.declarations[0].range)[0],
				ESMLiveExportDependency.KEYWORD
			);
			for (const declarator of declaration.declarations) {
				forEachPatternIdentifier(
					declarator.id,
					(identifier, shorthand, value) => {
						record(
							/** @type {LiveExportReferences} */ (lookup(identifier.name)),
							identifier,
							shorthand,
							declarator.id.type === "Identifier" ? declarator.init : value
						);
					}
				);
				// Without its keyword a statement opening with `{` reads as a block; a loop
				// head has no initializer and takes the pattern bare.
				if (declarator.id.type !== "Identifier" && declarator.init) {
					const range = /** @type {Range} */ (declarator.range);
					recordOccurrence(
						entries[0],
						range[0],
						range[1],
						ESMLiveExportDependency.PARENTHESIZED
					);
				}
			}
			return entries;
		};

		/**
		 * Records where a module mirrors a name once a loop assigned its next value.
		 * @param {LiveExportReferences} references the name
		 * @param {ForInStatement | ForOfStatement} loop the loop
		 */
		const recordLoopBody = (references, loop) => {
			const range = /** @type {Range} */ (loop.body.range);
			if (loop.body.type === "BlockStatement") {
				recordOccurrence(
					references,
					range[0] + 1,
					range[0] + 1,
					ESMLiveExportDependency.STATEMENT
				);
			} else {
				recordOccurrence(
					references,
					range[0],
					range[1],
					ESMLiveExportDependency.BODY
				);
			}
		};

		/**
		 * Records where a module mirrors the names one declarator declares.
		 * @param {VariableDeclaration} declaration the declaration
		 * @param {VariableDeclarator} declarator one of its declarators
		 */
		const recordMirroredDeclarator = (declaration, declarator) => {
			const path = /** @type {Node[]} */ (parser.statementPath);
			const parent = path[path.length - 1];
			const loop =
				(parent.type === "ForInStatement" ||
					parent.type === "ForOfStatement") &&
				parent.left === declaration
					? parent
					: undefined;
			const grandparent = path[path.length - 2];
			const inForInit =
				grandparent !== undefined &&
				grandparent.type === "ForStatement" &&
				grandparent.init === declaration;
			forEachPatternIdentifier(declarator.id, (identifier) => {
				const references =
					/** @type {LiveExportReferences | undefined} */
					(parser.getTagData(identifier.name, liveExportTag));
				if (references === undefined) return;
				const { group } = references;
				group.declared = true;
				// renaming counts the declarators of the statements it owns itself
				if (hot) references.varDeclarators++;
				if (declaration !== group.declaration) group.written = true;
				if (loop !== undefined) {
					recordLoopBody(references, loop);
				} else if (declarator.id.type !== "Identifier") {
					// a statement after it mirrors what the pattern took, a declarator in a loop's head
					const at = /** @type {Range} */ (declaration.range)[1];
					recordOccurrence(
						references,
						at,
						at,
						inForInit
							? ESMLiveExportDependency.DECLARATOR
							: ESMLiveExportDependency.STATEMENT
					);
				} else if (declarator.init) {
					const range = /** @type {Range} */ (declarator.init.range);
					recordOccurrence(
						references,
						range[0],
						range[1],
						isAnonymousFunctionDefinition(declarator.init)
							? ESMLiveExportDependency.NAMED_VALUE
							: ESMLiveExportDependency.VALUE
					);
				} else if (declaration.kind !== "var") {
					const at = /** @type {Range} */ (identifier.range)[1];
					recordOccurrence(
						references,
						at,
						at,
						ESMLiveExportDependency.UNDEFINED
					);
				} else if (declaration === group.declaration) {
					// a fresh instance starts its `var` undefined, before any write runs
					recordOccurrence(references, 0, 0, ESMLiveExportDependency.STATEMENT);
				}
			});
		};

		/**
		 * Records where a module mirrors a name a write just wrote.
		 * @param {LiveExportReferences} references the name
		 * @param {WriteStatement} node the writing construct
		 */
		const recordMirroredWrite = (references, node) => {
			references.group.written = true;
			if (node.type === "ForInStatement" || node.type === "ForOfStatement") {
				recordLoopBody(references, node);
				return;
			}
			const range = /** @type {Range} */ (node.range);
			recordOccurrence(
				references,
				range[0],
				range[1],
				ESMLiveExportDependency.SYNC
			);
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
			record(
				references,
				identifier,
				pendingShorthand,
				findPatternDefault(target, identifier)
			);
			return true;
		};

		parser.hooks.program.tap(PLUGIN_NAME, (ast) => {
			program = ast;
			claimable = undefined;
			varDeclarators = undefined;
			varLinks = undefined;
			groups = undefined;
			pendingPattern = undefined;
			untagged = false;
			usesEval = false;
			evalCalls = [];
			hot = Boolean(
				parser.state.module &&
				/** @type {NormalModule} */ (parser.state.module).hot
			);
		});

		parser.hooks.call.for("eval").tap(PLUGIN_NAME, (expression) => {
			usesEval = true;
			const range = /** @type {Range} */ (expression.range);
			evalCalls.push(range[0], range[1]);
		});

		// Counted before anything is claimed: a `var` the walk does not report as a
		// declarator, such as `var x = y` renaming `y`, keeps its name in the module.
		parser.hooks.preDeclarator.tap(
			{ name: PLUGIN_NAME, stage: -100 },
			(declarator, statement) => {
				if (statement.kind !== "var" || parser.scope.topLevelScope !== true) {
					return;
				}
				if (varDeclarators === undefined) {
					varDeclarators = new Map();
					varLinks = new Map();
				}
				const counts = varDeclarators;
				const links = /** @type {Map<string, string>} */ (varLinks);
				const names = declaredNames([declarator]);
				const first = declaredNames([statement.declarations[0]])[0];
				if (first === undefined) return;
				if (!links.has(first)) links.set(first, first);
				const anchor = findVarLink(first);
				for (const name of names) {
					counts.set(name, (counts.get(name) || 0) + 1);
					if (!links.has(name)) links.set(name, name);
					const linked = findVarLink(name);
					if (linked !== anchor) links.set(linked, anchor);
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
				const declarations = getClaimable();
				const declaration = declarations.get(id);
				if (declaration === undefined) return;
				/** @type {string[]} */
				let names;
				if (declaration.type !== "VariableDeclaration") {
					names = [id];
				} else if (declaration.kind !== "var") {
					names = declaredNames(declaration.declarations);
				} else {
					// every `var` declared beside one moves with it
					const anchor = findVarLink(id);
					names = [];
					for (const name of /** @type {Map<string, number>} */ (
						varDeclarators
					).keys()) {
						if (findVarLink(name) === anchor) names.push(name);
					}
					if (
						names.some((name) => {
							const other = declarations.get(name);
							return (
								other === undefined || other.type !== "VariableDeclaration"
							);
						})
					) {
						return;
					}
				}
				for (const name of names) declarations.delete(name);
				/** @type {LiveExportGroup} */
				const group = {
					declaration,
					names: [],
					occurrences: [],
					starts: new Set(),
					mirrors: [],
					mirrorKeys: new Set(),
					written: false,
					declared: false,
					lexicalStart:
						declaration.type === "ClassDeclaration" ||
						(declaration.type === "VariableDeclaration" &&
							declaration.kind === "let")
							? /** @type {Range} */ (declaration.range)[0]
							: -1,
					earlyUse: false
				};
				for (const name of names) {
					group.names.push({
						name,
						kindBase:
							group.names.length * ESMLiveExportDependency.KINDS_PER_NAME,
						group,
						varDeclarators: 0
					});
				}
				if (declaration.type !== "VariableDeclaration") {
					// A function is hoisted, so its binding is set before the module runs;
					// a class only once its declaration ran.
					const at =
						declaration.type === "FunctionDeclaration"
							? 0
							: /** @type {Range} */ (declaration.range)[1];
					recordOccurrence(
						group.names[0],
						at,
						at,
						ESMLiveExportDependency.STATEMENT
					);
					if (!hot) {
						recordOccurrence(
							group.names[0],
							at,
							at,
							ESMLiveExportDependency.INITIALIZE
						);
					}
				} else if (declaration.kind === "let" && !hot) {
					recordDeclaration(declaration, (name) =>
						group.names.find((references) => references.name === name)
					);
				}
				if (groups === undefined) groups = [];
				groups.push(group);
				untagged = true;
			}
		);

		// Tagged once the walk starts: the pre-walks may still redefine the name,
		// as the inner graph does for a declaration without an initializer.
		parser.hooks.statement.tap(PLUGIN_NAME, () => {
			if (!untagged) return;
			untagged = false;
			for (const group of /** @type {LiveExportGroup[]} */ (groups)) {
				for (const references of group.names) {
					parser.tagVariable(references.name, liveExportTag, references);
				}
			}
		});

		// Each `var` declaring hoisted names loses its keyword; one the group does not
		// wholly own leaves its names uncounted, so they stay where they are.
		parser.hooks.declarator.tap(
			{ name: PLUGIN_NAME, stage: -100 },
			(declarator, statement) => {
				if (statement.type === "VariableDeclaration") {
					recordMirroredDeclarator(statement, declarator);
				}
				if (hot) return;
				if (
					statement.type !== "VariableDeclaration" ||
					statement.kind !== "var" ||
					declarator !== statement.declarations[0]
				) {
					return;
				}
				const entries = recordDeclaration(
					statement,
					(name) =>
						/** @type {LiveExportReferences | undefined} */ (
							parser.getTagData(name, liveExportTag)
						)
				);
				if (entries === undefined) return;
				for (const references of entries) references.varDeclarators++;
				// declared again, the binding is assigned again too
				if (statement !== entries[0].group.declaration) {
					entries[0].group.written = true;
				}
			}
		);

		parser.hooks.expression
			.for(liveExportTag)
			.tap(PLUGIN_NAME, (expression) => {
				if (hot || expression.type !== "Identifier") return;
				record(
					/** @type {LiveExportReferences} */ (parser.currentTagData),
					expression,
					parser.scope.inShorthand === expression.name,
					undefined
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
			 * parser keeps it bound to the module-level declaration afterwards.
			 * @param {AssignmentExpression} expression the assignment
			 * @returns {true | void} true for a destructuring target
			 */
			(expression) => {
				const references = /** @type {LiveExportReferences} */ (
					parser.currentTagData
				);
				recordMirroredWrite(references, expression);
				if (hot) {
					pendingPattern = undefined;
					return expression.left.type === "Identifier" ? undefined : true;
				}
				if (expression.left.type === "Identifier") {
					// a compound assignment such as `+=` names nothing
					record(
						references,
						expression.left,
						false,
						expression.operator === "=" ||
							expression.operator === "||=" ||
							expression.operator === "&&=" ||
							expression.operator === "??="
							? expression.right
							: undefined
					);
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
				recordMirroredWrite(references, node);
				if (hot) {
					pendingPattern = undefined;
					return;
				}
				const target =
					node.type === "UpdateExpression" ? node.argument : node.left;
				if (target.type === "Identifier") {
					record(references, target, false, undefined);
				} else {
					recordPendingPattern(/** @type {Pattern} */ (target));
				}
			}
		);

		parser.hooks.finish.tap(PLUGIN_NAME, () => {
			const claimed = groups;
			const counted = varDeclarators;
			// The parser outlives the module, so its tree is let go here.
			program = undefined;
			claimable = undefined;
			varDeclarators = undefined;
			varLinks = undefined;
			groups = undefined;
			pendingPattern = undefined;
			if (claimed === undefined) return;
			for (const group of claimed) {
				// a hot update or an eval() call may write a binding the module leaves alone
				if (!group.written && !hot && !usesEval) continue;
				if (
					group.declaration.type === "VariableDeclaration" &&
					group.declaration.kind !== "var" &&
					!group.declared
				) {
					continue;
				}
				// A name redefined while the module was walked, or a `var` of it the walk
				// did not see, left occurrences unrecorded.
				const isVar =
					group.declaration.type === "VariableDeclaration" &&
					group.declaration.kind === "var";
				if (
					group.names.some(
						(references) =>
							parser.getTagData(references.name, liveExportTag) !==
								references ||
							(isVar &&
								references.varDeclarators !==
									/** @type {Map<string, number>} */ (counted).get(
										references.name
									))
					)
				) {
					continue;
				}
				for (const references of group.names) {
					for (let i = 0; i < evalCalls.length; i += 2) {
						recordOccurrence(
							references,
							evalCalls[i],
							evalCalls[i + 1],
							ESMLiveExportDependency.SYNC
						);
					}
				}
				parser.state.current.addDependency(
					new ESMLiveExportDependency(
						group.names.map((references) => references.name),
						// a copy holds no spare capacity from the pushes
						[...group.occurrences],
						[...group.mirrors],
						usesEval,
						hot,
						group.earlyUse
					)
				);
			}
		});
	}
}

module.exports = ESMLiveExportParserPlugin;
