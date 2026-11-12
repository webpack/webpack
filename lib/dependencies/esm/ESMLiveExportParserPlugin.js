/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const CompatibilityPlugin = require("../../javascript/CompatibilityPlugin");
const { Field, Flag, NodeType, Part } =
	require("../../javascript/syntax").parser;
const { harmonySpecifierTag } = require("./ESMImportDependencyParserPlugin");
const ESMLiveExportDependency = require("./ESMLiveExportDependency");

/** @import JavascriptParser, { JavascriptNodeReader } from "../../javascript/JavascriptParser" */
/** @import NormalModule from "../../module/NormalModule" */

/**
 * A module-level declaration an export may name: a `let` or `var` statement, or a
 * function or class, whose binding stays declared where it is. It is read by id,
 * and compared by where it starts, which a preparsed AST's view keeps.
 * @typedef {object} LiveDeclaration
 * @property {number} node the declaration
 * @property {number} type its `NodeType`
 * @property {string} kind a variable declaration's kind, `""` for others
 * @property {number} start where it starts
 * @property {number} end where it ends
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
 * An identifier a destructuring write reported as a pattern, which an `assign`
 * or `write` call may follow.
 * @typedef {object} PendingPattern
 * @property {string} name its name
 * @property {number} start where it starts
 * @property {number} end where it ends
 */

/**
 * The loop whose head holds a declaration, or the `for` whose init it is.
 * @typedef {object} LoopHead
 * @property {number} loop a `for…in` or `for…of` loop declaring it, `0` for a `for` init
 */

/**
 * Whether a value takes its name from the binding it is assigned to.
 * @param {JavascriptNodeReader} path the reader of the node
 * @param {number} node the assigned value, `0` for none
 * @returns {boolean} true for an anonymous function or class
 */
const isAnonymousFunctionDefinition = (path, node) => {
	if (node === 0) return false;
	switch (path.type(node)) {
		case NodeType.ArrowFunctionExpression:
			return true;
		case NodeType.FunctionExpression:
		case NodeType.ClassExpression:
			return path.field(0, Field.id, node) === 0;
		default:
			return false;
	}
};

/**
 * Calls back with each identifier a binding pattern declares or assigns.
 * @param {JavascriptNodeReader} path the reader of the node
 * @param {number} pattern the pattern, `0` for none
 * @param {(identifier: number, shorthand: boolean, value: number) => void} callback with the identifier, whether a shorthand property holds it, and its default, `0` for none
 * @returns {void}
 */
const forEachPatternIdentifier = (path, pattern, callback) => {
	if (pattern === 0) return;
	switch (path.type(pattern)) {
		case NodeType.Identifier:
			callback(pattern, false, 0);
			return;
		case NodeType.AssignmentPattern: {
			const left = path.field(0, Field.left, pattern);
			if (path.type(left) === NodeType.Identifier) {
				callback(left, false, path.field(0, Field.right, pattern));
			} else {
				forEachPatternIdentifier(path, left, callback);
			}
			return;
		}
		case NodeType.ObjectPattern: {
			const count = path.fieldCount(Field.properties, pattern);
			for (let i = 0; i < count; i++) {
				const property = path.field(i, Field.properties, pattern);
				if (path.type(property) === NodeType.RestElement) {
					forEachPatternIdentifier(
						path,
						path.field(0, Field.argument, property),
						callback
					);
					continue;
				}
				const value = path.field(0, Field.value, property);
				const valueType = path.type(value);
				const shorthand = path.flag(Flag.shorthand, property);
				if (shorthand && valueType === NodeType.Identifier) {
					callback(value, true, 0);
				} else if (
					shorthand &&
					valueType === NodeType.AssignmentPattern &&
					path.type(path.field(0, Field.left, value)) === NodeType.Identifier
				) {
					callback(
						path.field(0, Field.left, value),
						true,
						path.field(0, Field.right, value)
					);
				} else {
					forEachPatternIdentifier(path, value, callback);
				}
			}
			return;
		}
		case NodeType.ArrayPattern: {
			const count = path.fieldCount(Field.elements, pattern);
			for (let i = 0; i < count; i++) {
				forEachPatternIdentifier(
					path,
					path.field(i, Field.elements, pattern),
					callback
				);
			}
			return;
		}
		case NodeType.RestElement:
			forEachPatternIdentifier(
				path,
				path.field(0, Field.argument, pattern),
				callback
			);
	}
};

/**
 * The names the declarators of a declaration bind.
 * @param {JavascriptNodeReader} path the reader of the node
 * @param {number} declaration the declaration
 * @param {number=} only the one declarator to read, or all of them
 * @returns {string[]} their names
 */
const declaredNames = (path, declaration, only) => {
	/** @type {string[]} */
	const names = [];
	/**
	 * @param {number} identifier a declared identifier
	 */
	const add = (identifier) => {
		names.push(path.name(identifier));
	};
	if (only !== undefined) {
		forEachPatternIdentifier(path, path.field(0, Field.id, only), add);
		return names;
	}
	const count = path.fieldCount(Field.declarations, declaration);
	for (let i = 0; i < count; i++) {
		const declarator = path.field(i, Field.declarations, declaration);
		forEachPatternIdentifier(path, path.field(0, Field.id, declarator), add);
	}
	return names;
};

/**
 * Finds the default a destructuring target gives an identifier, if any.
 * @param {JavascriptNodeReader} path the reader of the node
 * @param {number} pattern the destructuring target, `0` for none
 * @param {number} start where the identifier in it starts
 * @returns {number} the default value, `0` for none
 */
const findPatternDefault = (path, pattern, start) => {
	if (pattern === 0) return 0;
	switch (path.type(pattern)) {
		case NodeType.AssignmentPattern: {
			const left = path.field(0, Field.left, pattern);
			return path.type(left) === NodeType.Identifier &&
				path.start(left) === start
				? path.field(0, Field.right, pattern)
				: findPatternDefault(path, left, start);
		}
		case NodeType.ObjectPattern: {
			const count = path.fieldCount(Field.properties, pattern);
			for (let i = 0; i < count; i++) {
				const property = path.field(i, Field.properties, pattern);
				const found = findPatternDefault(
					path,
					path.field(
						0,
						path.type(property) === NodeType.RestElement
							? Field.argument
							: Field.value,
						property
					),
					start
				);
				if (found !== 0) return found;
			}
			return 0;
		}
		case NodeType.ArrayPattern: {
			const count = path.fieldCount(Field.elements, pattern);
			for (let i = 0; i < count; i++) {
				const found = findPatternDefault(
					path,
					path.field(i, Field.elements, pattern),
					start
				);
				if (found !== 0) return found;
			}
			return 0;
		}
		case NodeType.RestElement:
			return findPatternDefault(
				path,
				path.field(0, Field.argument, pattern),
				start
			);
		default:
			return 0;
	}
};

/**
 * A module-level declaration, read by id.
 * @param {JavascriptNodeReader} path the reader of the node
 * @param {number} node the declaration
 * @returns {LiveDeclaration} it
 */
const liveDeclarationOf = (path, node) => {
	const type = path.type(node);
	return {
		node,
		type,
		kind:
			(type === NodeType.VariableDeclaration && path.textOf(Part.kind, node)) ||
			"",
		start: path.start(node),
		end: path.end(node)
	};
};

const liveExportTag =
	/** @type {import("../../javascript/JavascriptParser").Tag<LiveExportReferences>} */ (
		Symbol("live export")
	);

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
		// the program, read as its object only where an export claims a declaration
		/** @type {JavascriptNodeReader | undefined} */
		let programPath;
		let programNode = 0;
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
		/** @type {PendingPattern | undefined} */
		let pendingPattern;
		// the loop heads holding a declaration, by where it starts
		/** @type {Map<number, LoopHead> | undefined} */
		let loopHeads;
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
			const path = /** @type {JavascriptNodeReader} */ (programPath);
			const count = path.fieldCount(Field.body, programNode);
			for (let i = 0; i < count; i++) {
				const statement = path.field(i, Field.body, programNode);
				const statementType = path.type(statement);
				const declaration =
					statementType === NodeType.ExportNamedDeclaration ||
					statementType === NodeType.ExportDefaultDeclaration
						? path.field(0, Field.declaration, statement)
						: statement;
				if (declaration === 0) continue;
				const type = path.type(declaration);
				if (
					type === NodeType.FunctionDeclaration ||
					type === NodeType.ClassDeclaration
				) {
					const name = path.field(0, Field.id, declaration);
					if (name !== 0) {
						claimable.set(
							path.name(name),
							liveDeclarationOf(path, declaration)
						);
					}
				} else if (type === NodeType.VariableDeclaration) {
					const kind = path.textOf(Part.kind, declaration);
					if (kind !== "let" && kind !== "var" && !(hot && kind === "const")) {
						continue;
					}
					const live = liveDeclarationOf(path, declaration);
					for (const name of declaredNames(path, declaration)) {
						if (!claimable.has(name)) claimable.set(name, live);
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
		 * @param {number} start where the reference starts
		 * @param {number} end where it ends
		 * @param {boolean} shorthand whether a shorthand property holds it
		 * @param {JavascriptNodeReader} path the reader of the value
		 * @param {number} value what it is assigned, `0` for nothing
		 */
		const record = (references, start, end, shorthand, path, value) => {
			if (start < references.group.lexicalStart) {
				references.group.earlyUse = true;
			}
			if (
				recordOccurrence(
					references,
					start,
					end,
					shorthand
						? ESMLiveExportDependency.SHORTHAND
						: ESMLiveExportDependency.REFERENCE
				) &&
				isAnonymousFunctionDefinition(path, value)
			) {
				recordOccurrence(
					references,
					path.start(value),
					path.end(value),
					ESMLiveExportDependency.NAMED
				);
			}
		};

		/**
		 * Records the names, keyword and parentheses of a variable declaration, when
		 * every name it declares belongs to one group.
		 * @param {JavascriptNodeReader} path the reader of the declaration
		 * @param {number} declaration the declaration
		 * @param {(name: string) => LiveExportReferences | undefined} lookup the group's entry for a name
		 * @returns {LiveExportReferences[] | undefined} the entries of its names, in order
		 */
		const recordDeclaration = (path, declaration, lookup) => {
			/** @type {LiveExportReferences[]} */
			const entries = [];
			/** @type {LiveExportGroup | undefined} */
			let group;
			for (const name of declaredNames(path, declaration)) {
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
				path.start(declaration),
				path.start(path.field(0, Field.declarations, declaration)),
				ESMLiveExportDependency.KEYWORD
			);
			const count = path.fieldCount(Field.declarations, declaration);
			for (let i = 0; i < count; i++) {
				const declarator = path.field(i, Field.declarations, declaration);
				const id = path.field(0, Field.id, declarator);
				const isName = path.type(id) === NodeType.Identifier;
				const init = path.field(0, Field.init, declarator);
				forEachPatternIdentifier(path, id, (identifier, shorthand, value) => {
					record(
						/** @type {LiveExportReferences} */ (lookup(path.name(identifier))),
						path.start(identifier),
						path.end(identifier),
						shorthand,
						path,
						isName ? init : value
					);
				});
				// Without its keyword a statement opening with `{` reads as a block; a loop
				// head has no initializer and takes the pattern bare.
				if (!isName && init !== 0) {
					recordOccurrence(
						entries[0],
						path.start(declarator),
						path.end(declarator),
						ESMLiveExportDependency.PARENTHESIZED
					);
				}
			}
			return entries;
		};

		/**
		 * Records where a module mirrors a name once a loop assigned its next value.
		 * @param {LiveExportReferences} references the name
		 * @param {JavascriptNodeReader} path the reader of the loop
		 * @param {number} loop the `for…in` or `for…of` loop
		 */
		const recordLoopBody = (references, path, loop) => {
			const body = path.field(0, Field.body, loop);
			const start = path.start(body);
			if (path.type(body) === NodeType.BlockStatement) {
				recordOccurrence(
					references,
					start + 1,
					start + 1,
					ESMLiveExportDependency.STATEMENT
				);
			} else {
				recordOccurrence(
					references,
					start,
					path.end(body),
					ESMLiveExportDependency.BODY
				);
			}
		};

		/**
		 * Records where a module mirrors the names one declarator declares.
		 * @param {JavascriptNodeReader} path the reader of the declaration
		 * @param {number} declaration the declaration
		 * @param {number} declarator one of its declarators
		 */
		const recordMirroredDeclarator = (path, declaration, declarator) => {
			const declarationStart = path.start(declaration);
			const head =
				loopHeads === undefined ? undefined : loopHeads.get(declarationStart);
			const loop = head === undefined ? 0 : head.loop;
			const inForInit = head !== undefined && loop === 0;
			const id = path.field(0, Field.id, declarator);
			const init = path.field(0, Field.init, declarator);
			const kind = path.textOf(Part.kind, declaration);
			forEachPatternIdentifier(path, id, (identifier) => {
				const references =
					/** @type {LiveExportReferences | undefined} */
					(parser.getTagData(path.name(identifier), liveExportTag));
				if (references === undefined) return;
				const { group } = references;
				const ownDeclaration = declarationStart === group.declaration.start;
				group.declared = true;
				// renaming counts the declarators of the statements it owns itself
				if (hot) references.varDeclarators++;
				if (!ownDeclaration) group.written = true;
				if (loop !== 0) {
					recordLoopBody(references, path, loop);
				} else if (path.type(id) !== NodeType.Identifier) {
					// a statement after it mirrors what the pattern took, a declarator in a loop's head
					const at = path.end(declaration);
					recordOccurrence(
						references,
						at,
						at,
						inForInit
							? ESMLiveExportDependency.DECLARATOR
							: ESMLiveExportDependency.STATEMENT
					);
				} else if (init !== 0) {
					recordOccurrence(
						references,
						path.start(init),
						path.end(init),
						isAnonymousFunctionDefinition(path, init)
							? ESMLiveExportDependency.NAMED_VALUE
							: ESMLiveExportDependency.VALUE
					);
				} else if (kind !== "var") {
					const at = path.end(identifier);
					recordOccurrence(
						references,
						at,
						at,
						ESMLiveExportDependency.UNDEFINED
					);
				} else if (ownDeclaration) {
					// a fresh instance starts its `var` undefined, before any write runs
					recordOccurrence(references, 0, 0, ESMLiveExportDependency.STATEMENT);
				}
			});
		};

		/**
		 * Records where a module mirrors a name a write just wrote.
		 * @param {LiveExportReferences} references the name
		 * @param {JavascriptNodeReader} path the reader of the construct
		 * @param {number} node the writing construct
		 */
		const recordMirroredWrite = (references, path, node) => {
			references.group.written = true;
			const type = path.type(node);
			if (
				type === NodeType.ForInStatement ||
				type === NodeType.ForOfStatement
			) {
				recordLoopBody(references, path, node);
				return;
			}
			recordOccurrence(
				references,
				path.start(node),
				path.end(node),
				ESMLiveExportDependency.SYNC
			);
		};

		/**
		 * Records the identifier a destructuring write just reported as a pattern.
		 * @param {JavascriptNodeReader} path the reader of the target
		 * @param {number} target the destructuring target containing it
		 * @returns {boolean} true when it belonged to the tagged name
		 */
		const recordPendingPattern = (path, target) => {
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
				identifier.start,
				identifier.end,
				pendingShorthand,
				path,
				findPatternDefault(path, target, identifier.start)
			);
			return true;
		};

		parser.hooks.program.tap({ name: PLUGIN_NAME, path: true }, (path, ast) => {
			programPath = path;
			programNode = ast;
			claimable = undefined;
			varDeclarators = undefined;
			varLinks = undefined;
			groups = undefined;
			pendingPattern = undefined;
			loopHeads = undefined;
			untagged = false;
			usesEval = false;
			evalCalls = [];
			hot = Boolean(
				parser.state.module &&
				/** @type {NormalModule} */ (parser.state.module).hot
			);
		});

		parser.hooks.call
			.for("eval")
			.tap({ name: PLUGIN_NAME, path: true }, (path, expression) => {
				usesEval = true;
				evalCalls.push(path.start(expression), path.end(expression));
			});

		// Counted before anything is claimed: a `var` the walk does not report as a
		// declarator, such as `var x = y` renaming `y`, keeps its name in the module.
		parser.hooks.preDeclarator.tap(
			{ name: PLUGIN_NAME, stage: -100, path: true },
			(path, declaratorNode, statementNode) => {
				// every declarator comes here, so it reads ids
				if (
					parser.scope.topLevelScope !== true ||
					path.textOf(Part.kind, statementNode) !== "var"
				) {
					return;
				}
				if (varDeclarators === undefined) {
					varDeclarators = new Map();
					varLinks = new Map();
				}
				const counts = varDeclarators;
				const links = /** @type {Map<string, string>} */ (varLinks);
				const names = declaredNames(path, statementNode, declaratorNode);
				const first = declaredNames(
					path,
					statementNode,
					path.field(0, Field.declarations, statementNode)
				)[0];
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
			{ name: PLUGIN_NAME, stage: -10, path: true },
			(_path, _statement, id) => {
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
				const path = /** @type {JavascriptNodeReader} */ (programPath);
				if (declaration.type !== NodeType.VariableDeclaration) {
					names = [id];
				} else if (declaration.kind !== "var") {
					names = declaredNames(path, declaration.node);
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
								other === undefined ||
								other.type !== NodeType.VariableDeclaration
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
						declaration.type === NodeType.ClassDeclaration ||
						(declaration.type === NodeType.VariableDeclaration &&
							declaration.kind === "let")
							? declaration.start
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
				if (declaration.type !== NodeType.VariableDeclaration) {
					// A function is hoisted, so its binding is set before the module runs;
					// a class only once its declaration ran.
					const at =
						declaration.type === NodeType.FunctionDeclaration
							? 0
							: declaration.end;
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
					recordDeclaration(path, declaration.node, (name) =>
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
		// Each loop head holding a declaration is noted before its declarators come.
		parser.hooks.statement.tap(
			{ name: PLUGIN_NAME, path: true },
			(path, node) => {
				if (groups === undefined) return;
				const type = path.type(node);
				const head =
					type === NodeType.ForInStatement || type === NodeType.ForOfStatement
						? path.field(0, Field.left, node)
						: type === NodeType.ForStatement
							? path.field(0, Field.init, node)
							: 0;
				if (head !== 0 && path.type(head) === NodeType.VariableDeclaration) {
					if (loopHeads === undefined) loopHeads = new Map();
					loopHeads.set(path.start(head), {
						loop: type === NodeType.ForStatement ? 0 : node
					});
				}
				if (!untagged) return;
				untagged = false;
				for (const group of groups) {
					for (const references of group.names) {
						parser.tagVariable(references.name, liveExportTag, references);
					}
				}
			}
		);

		// Each `var` declaring hoisted names loses its keyword; one the group does not
		// wholly own leaves its names uncounted, so they stay where they are.
		parser.hooks.declarator.tap(
			{ name: PLUGIN_NAME, stage: -100, path: true },
			(path, declaratorNode, statementNode) => {
				// only a name a claimed group tagged is recorded, so most modules stop here
				if (groups === undefined) return;
				const isDeclaration =
					path.type(statementNode) === NodeType.VariableDeclaration;
				if (isDeclaration) {
					recordMirroredDeclarator(path, statementNode, declaratorNode);
				}
				if (hot) return;
				if (
					!isDeclaration ||
					path.textOf(Part.kind, statementNode) !== "var" ||
					path.start(declaratorNode) !==
						path.start(path.field(0, Field.declarations, statementNode))
				) {
					return;
				}
				const entries = recordDeclaration(
					path,
					statementNode,
					(name) =>
						/** @type {LiveExportReferences | undefined} */ (
							parser.getTagData(name, liveExportTag)
						)
				);
				if (entries === undefined) return;
				for (const references of entries) references.varDeclarators++;
				// declared again, the binding is assigned again too
				if (path.start(statementNode) !== entries[0].group.declaration.start) {
					entries[0].group.written = true;
				}
			}
		);

		parser.hooks.expression
			.for(liveExportTag)
			.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
				if (hot || path.type(node) !== NodeType.Identifier) return;
				record(
					/** @type {LiveExportReferences} */ (parser.currentTagData),
					path.start(node),
					path.end(node),
					parser.scope.inShorthand === path.name(node),
					path,
					0
				);
			});

		parser.hooks.pattern
			.for(liveExportTag)
			.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
				const name = path.name(node);
				pendingPattern = { name, start: path.start(node), end: path.end(node) };
				pendingShorthand = parser.scope.inShorthand === name;
			});

		parser.hooks.assign.for(liveExportTag).tap(
			{ name: PLUGIN_NAME, path: true },
			/**
			 * Records an assigned name; a destructuring target is claimed here, so the
			 * parser keeps it bound to the module-level declaration afterwards.
			 * @param {JavascriptNodeReader} path the reader of the assignment
			 * @param {number} node the assignment
			 * @returns {true | void} true for a destructuring target
			 */
			(path, node) => {
				const references = /** @type {LiveExportReferences} */ (
					parser.currentTagData
				);
				recordMirroredWrite(references, path, node);
				const left = path.field(0, Field.left, node);
				const isName = path.type(left) === NodeType.Identifier;
				if (hot) {
					pendingPattern = undefined;
					return isName ? undefined : true;
				}
				if (isName) {
					const operator = path.textOf(Part.operator, node);
					// a compound assignment such as `+=` names nothing
					record(
						references,
						path.start(left),
						path.end(left),
						false,
						path,
						operator === "=" ||
							operator === "||=" ||
							operator === "&&=" ||
							operator === "??="
							? path.field(0, Field.right, node)
							: 0
					);
					return;
				}
				if (recordPendingPattern(path, left)) return true;
			}
		);

		parser.hooks.write.for(liveExportTag).tap(
			{ name: PLUGIN_NAME, path: true },
			/**
			 * Records a name an update or a loop binding writes.
			 * @param {JavascriptNodeReader} path the reader of the construct
			 * @param {number} id the writing construct
			 */
			(path, id) => {
				const references = /** @type {LiveExportReferences} */ (
					parser.currentTagData
				);
				recordMirroredWrite(references, path, id);
				if (hot) {
					pendingPattern = undefined;
					return;
				}
				const target = path.field(
					0,
					path.type(id) === NodeType.UpdateExpression
						? Field.argument
						: Field.left,
					id
				);
				if (path.type(target) === NodeType.Identifier) {
					record(
						references,
						path.start(target),
						path.end(target),
						false,
						path,
						0
					);
				} else {
					recordPendingPattern(path, target);
				}
			}
		);

		parser.hooks.finish.tap({ name: PLUGIN_NAME, path: true }, () => {
			const claimed = groups;
			const counted = varDeclarators;
			// The parser outlives the module, so its tree is let go here.
			programPath = undefined;
			programNode = 0;
			claimable = undefined;
			varDeclarators = undefined;
			varLinks = undefined;
			groups = undefined;
			pendingPattern = undefined;
			loopHeads = undefined;
			if (claimed === undefined) return;
			for (const group of claimed) {
				// a hot update or an eval() call may write a binding the module leaves alone
				if (!group.written && !hot && !usesEval) continue;
				if (
					group.declaration.type === NodeType.VariableDeclaration &&
					group.declaration.kind !== "var" &&
					!group.declared
				) {
					continue;
				}
				// A name redefined while the module was walked, or a `var` of it the walk
				// did not see, left occurrences unrecorded.
				const isVar =
					group.declaration.type === NodeType.VariableDeclaration &&
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
