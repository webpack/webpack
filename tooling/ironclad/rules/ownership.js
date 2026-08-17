/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/**
 * Prototype of the ironclad-js ownership/borrow rule.
 *
 * Ownership is expressed with comment markers, so nothing is added to the
 * emitted code:
 *
 *   const b = \/** @move *\/ a;          // `a` is unusable afterwards
 *   const r = \/** @borrow *\/ a;        // shared, read-only view of `a`
 *   const m = \/** @borrowMut *\/ a;     // exclusive view of `a`
 *
 * A borrow is live from its creation to the last reference of the variable
 * holding it (non-lexical lifetimes), not to the end of the block.
 */

/** @typedef {import("estree").Node} Node */
/** @typedef {import("estree").Identifier} Identifier */
/** @typedef {import("estree").MemberExpression} MemberExpression */
/** @typedef {import("estree").CallExpression} CallExpression */
/** @typedef {import("eslint").AST.Range} Range */
/** @typedef {import("eslint").Rule.CodePathSegment} CodePathSegment */
/** @typedef {import("eslint").Rule.RuleModule} RuleModule */
/** @typedef {import("eslint").Scope.Reference} Reference */
/** @typedef {import("eslint").Scope.Scope} Scope */
/** @typedef {import("eslint").Scope.Variable} Variable */
/** @typedef {import("eslint").SourceCode} SourceCode */

/**
 * @typedef {object} Borrow
 * @property {"borrow" | "borrowMut"} kind shared or exclusive
 * @property {Variable} owner variable being borrowed
 * @property {Variable | null} holder variable the borrow is stored in
 * @property {Identifier} node identifier that created the borrow
 * @property {number} start first offset the borrow is live at
 * @property {number} end last offset the borrow is live at
 */

/**
 * @typedef {object} MoveInfo
 * @property {Node} node node blamed for the move
 * @property {number} end offset after which the value is gone
 */

// `borrowMut` first: `@borrow` would otherwise match its prefix.
const MARKER_REGEXP = /@(borrowMut|borrow|move)\b/;

const LOOP_TYPES = new Set([
	"DoWhileStatement",
	"ForInStatement",
	"ForOfStatement",
	"ForStatement",
	"WhileStatement"
]);

const FUNCTION_TYPES = new Set([
	"ArrowFunctionExpression",
	"FunctionDeclaration",
	"FunctionExpression"
]);

// Inits that produce a primitive, which is copied rather than moved.
const COPY_INIT_TYPES = new Set([
	"BinaryExpression",
	"Literal",
	"TemplateLiteral",
	"UnaryExpression",
	"UpdateExpression"
]);

/**
 * Builds a child to parent map, so the rule can look upwards from any node
 * before ESLint has traversed to it.
 * @param {SourceCode} sourceCode source code
 * @returns {Map<Node, Node>} parent of every node below `Program`
 */
const buildParents = (sourceCode) => {
	/** @type {Map<Node, Node>} */
	const parents = new Map();
	const visitorKeys = sourceCode.visitorKeys;
	/**
	 * @param {Node} node node to descend into
	 * @returns {void}
	 */
	const walk = (node) => {
		const keys = visitorKeys[node.type] || Object.keys(node);
		for (const key of keys) {
			const value = /** @type {Record<string, unknown>} */ (
				/** @type {unknown} */ (node)
			)[key];
			const children = Array.isArray(value) ? value : [value];
			for (const child of children) {
				if (!child || typeof (/** @type {Node} */ (child).type) !== "string") {
					continue;
				}
				parents.set(/** @type {Node} */ (child), node);
				walk(/** @type {Node} */ (child));
			}
		}
	};
	walk(/** @type {Node} */ (sourceCode.ast));
	return parents;
};

/**
 * @param {Scope} scope scope to start from
 * @param {Map<Identifier, Reference>} result collected references by identifier
 * @returns {Map<Identifier, Reference>} `result`
 */
const collectReferences = (scope, result) => {
	for (const reference of scope.references) {
		result.set(/** @type {Identifier} */ (reference.identifier), reference);
	}
	for (const child of scope.childScopes) collectReferences(child, result);
	return result;
};

/**
 * @param {Node} node node to locate
 * @returns {string} 1-based line the node starts on
 */
const lineOf = (node) =>
	String(/** @type {import("estree").SourceLocation} */ (node.loc).start.line);

/**
 * @param {Scope} inner candidate inner scope
 * @param {Scope} outer candidate outer scope
 * @returns {boolean} true when `outer` strictly contains `inner`
 */
const isInnerScope = (inner, outer) => {
	for (let scope = inner.upper; scope; scope = scope.upper) {
		if (scope === outer) return true;
	}
	return false;
};

/**
 * @param {Variable} variable variable to inspect
 * @returns {boolean} true when every definition initializes it to a primitive
 */
const isCopyVariable = (variable) => {
	if (variable.defs.length === 0) return false;
	return variable.defs.every((def) => {
		const init =
			def.node.type === "VariableDeclarator" ? def.node.init : undefined;
		return (
			Boolean(init) && COPY_INIT_TYPES.has(/** @type {Node} */ (init).type)
		);
	});
};

/** @type {RuleModule} */
const rule = {
	meta: {
		type: "problem",
		docs: {
			description: "enforce comment-driven ownership, move and borrow semantics"
		},
		schema: [
			{
				type: "object",
				properties: {
					implicitMove: { type: "boolean" },
					moveOnCall: { type: "array", items: { type: "string" } }
				},
				additionalProperties: false
			}
		],
		messages: {
			useAfterMove:
				"`{{name}}` was moved on line {{line}} and cannot be used afterwards.",
			moveInLoop:
				"`{{name}}` is declared outside this loop, so moving it here uses it after move on the next iteration.",
			moveInClosure:
				"`{{name}}` is declared outside this function, so moving it here moves it again on every call.",
			moveWhileBorrowed:
				"`{{name}}` cannot be moved while a {{kind}} borrow created on line {{line}} is still live.",
			useWhileMutablyBorrowed:
				"`{{name}}` cannot be used while the mutable borrow created on line {{line}} is still live.",
			mutationWhileShared:
				"`{{name}}` cannot be mutated while the shared borrow created on line {{line}} is still live.",
			conflictingBorrow:
				"cannot take a {{kind}} borrow of `{{name}}` while a {{otherKind}} borrow created on line {{line}} is still live.",
			borrowEscapes:
				"borrow of `{{name}}` outlives it: `{{name}}` dies with this scope."
		}
	},
	create(context) {
		const sourceCode = context.sourceCode;
		const options = context.options[0] || {};
		const moveOnCall = new Set(
			/** @type {string[]} */ (options.moveOnCall) || ["postMessage"]
		);
		const implicitMove = options.implicitMove === true;

		const parents = buildParents(sourceCode);
		const referenceOf = collectReferences(
			sourceCode.scopeManager.globalScope ||
				sourceCode.getScope(sourceCode.ast),
			new Map()
		);

		/** @type {Map<Variable, Borrow[]>} */
		const borrowsByOwner = new Map();
		/** @type {Map<Identifier, Borrow>} */
		const borrowByNode = new Map();
		/** @type {Map<string, Map<Variable, MoveInfo>>} */
		const segmentMoves = new Map();
		/** @type {CodePathSegment[]} */
		const segmentStack = [];

		/**
		 * @param {Node} node node to look above
		 * @returns {Node | undefined} parent node
		 */
		const parentOf = (node) => parents.get(node);

		/**
		 * An immediately invoked function runs exactly once, in place, so it does
		 * not turn a move into a repeatable one.
		 * @param {Node} node function node
		 * @returns {boolean} true when the function is called where it is written
		 */
		const isImmediatelyInvoked = (node) => {
			let current = node;
			let parent = parentOf(current);
			// `(async () => {})()`, `void (function () {})()`, `await (…)()`.
			while (
				parent &&
				(parent.type === "AwaitExpression" ||
					(parent.type === "UnaryExpression" && parent.operator === "void"))
			) {
				current = parent;
				parent = parentOf(current);
			}
			return Boolean(
				parent && parent.type === "CallExpression" && parent.callee === node
			);
		};

		/**
		 * @param {Node} node node to start from
		 * @param {Node} boundary node to stop at
		 * @returns {Node[]} function nodes between `node` and `boundary`
		 */
		const functionsBetween = (node, boundary) => {
			/** @type {Node[]} */
			const result = [];
			for (
				let above = parentOf(node);
				above && above !== boundary;
				above = parentOf(above)
			) {
				if (FUNCTION_TYPES.has(above.type)) result.push(above);
			}
			return result;
		};

		/**
		 * @param {Node} node node the marker would precede
		 * @returns {string | null} marker name
		 */
		const markerBefore = (node) => {
			const comments = sourceCode.getCommentsBefore(
				/** @type {Parameters<SourceCode["getCommentsBefore"]>[0]} */ (node)
			);
			for (let i = comments.length - 1; i >= 0; i--) {
				const match = MARKER_REGEXP.exec(comments[i].value);
				if (match) return match[1];
			}
			return null;
		};

		/**
		 * A marker may sit on the identifier itself or on the statement that
		 * consumes it, whichever reads better at the call site.
		 * @param {Identifier} node identifier in a read position
		 * @returns {string | null} marker name
		 */
		const markerFor = (node) => {
			const own = markerBefore(node);
			if (own) return own;
			const parent = parentOf(node);
			if (!parent) return null;
			if (parent.type === "VariableDeclarator" && parent.init === node) {
				const declaration = parentOf(parent);
				if (
					declaration &&
					declaration.type === "VariableDeclaration" &&
					declaration.declarations[0] === parent
				) {
					return markerBefore(declaration);
				}
			}
			if (parent.type === "AssignmentExpression" && parent.right === node) {
				return markerBefore(parent);
			}
			return null;
		};

		/**
		 * @returns {Map<Variable, MoveInfo> | null} move state of the innermost
		 * reachable segment
		 */
		const currentMoves = () => {
			for (let i = segmentStack.length - 1; i >= 0; i--) {
				const segment = segmentStack[i];
				if (!segment.reachable) continue;
				return segmentMoves.get(segment.id) || null;
			}
			return null;
		};

		/**
		 * Climbs out of a member chain so `a.b.c = 1` is seen as a write to `a`.
		 * @param {Identifier} node identifier to test
		 * @param {Reference} reference its resolved reference
		 * @returns {boolean} true when the reference mutates the value
		 */
		const isMutatingUse = (node, reference) => {
			if (reference.isWrite()) return true;
			/** @type {Node} */
			let current = node;
			let parent = parentOf(current);
			while (
				parent &&
				parent.type === "MemberExpression" &&
				parent.object === current
			) {
				current = parent;
				parent = parentOf(current);
			}
			if (current === node || !parent) return false;
			if (parent.type === "AssignmentExpression")
				return parent.left === current;
			if (parent.type === "UpdateExpression") return true;
			return parent.type === "UnaryExpression" && parent.operator === "delete";
		};

		/**
		 * Calls listed in `moveOnCall` consume their arguments — `postMessage`
		 * detaches everything in its transfer list, so the value really is gone.
		 * @param {Identifier} node identifier in argument position
		 * @returns {CallExpression | null} the consuming call
		 */
		const consumingCall = (node) => {
			let argument = /** @type {Node} */ (node);
			let parent = parentOf(argument);
			// `postMessage(value, [value])` — the transfer list counts too.
			if (parent && parent.type === "ArrayExpression") {
				argument = parent;
				parent = parentOf(argument);
			}
			if (
				!parent ||
				parent.type !== "CallExpression" ||
				!parent.arguments.includes(
					/** @type {import("estree").Expression} */ (argument)
				)
			) {
				return null;
			}
			const callee = parent.callee;
			/** @type {string | null} */
			let name = null;
			if (callee.type === "Identifier") name = callee.name;
			else if (
				callee.type === "MemberExpression" &&
				!callee.computed &&
				callee.property.type === "Identifier"
			) {
				name = callee.property.name;
			}
			return name && moveOnCall.has(name) ? parent : null;
		};

		/**
		 * @param {Identifier} node identifier being consumed
		 * @returns {boolean} true when a bare `let b = a` should move
		 */
		const isImplicitMove = (node) => {
			if (!implicitMove) return false;
			const parent = parentOf(node);
			if (!parent) return false;
			return (
				(parent.type === "VariableDeclarator" && parent.init === node) ||
				(parent.type === "AssignmentExpression" && parent.right === node)
			);
		};

		/**
		 * @param {Variable} variable owner variable
		 * @param {number} position offset to test
		 * @param {Borrow | undefined} exclude borrow created at this position
		 * @returns {Borrow[]} borrows live at `position`
		 */
		const liveBorrows = (variable, position, exclude) => {
			const borrows = borrowsByOwner.get(variable);
			if (!borrows) return [];
			return borrows.filter(
				(borrow) =>
					borrow !== exclude &&
					position >= borrow.start &&
					position <= borrow.end
			);
		};

		// Borrows are collected up front: the live range of a borrow ends at the
		// last reference of the variable holding it, which scope analysis already
		// knows and traversal order would not.
		/**
		 * @returns {void}
		 */
		const collectBorrows = () => {
			for (const [node, reference] of referenceOf) {
				const owner = reference.resolved;
				if (!owner || !reference.isRead()) continue;
				const marker = markerFor(node);
				if (marker !== "borrow" && marker !== "borrowMut") continue;
				const parent = parentOf(node);
				/** @type {Variable | null} */
				let holder = null;
				let end = node.range ? node.range[1] : 0;
				if (parent && parent.type === "VariableDeclarator") {
					const declared = sourceCode.getDeclaredVariables(parent);
					holder = declared.length === 1 ? declared[0] : null;
				}
				if (holder) {
					for (const holderReference of holder.references) {
						const range = /** @type {Range} */ (
							holderReference.identifier.range
						);
						if (range[1] > end) end = range[1];
					}
				} else {
					// A borrow nothing stores — `read(/** @borrow *\/ a)` — lives for
					// the enclosing statement.
					let statement = /** @type {Node} */ (node);
					for (
						let above = parentOf(statement);
						above && above.type !== "ExpressionStatement";
						above = parentOf(statement)
					) {
						statement = above;
					}
					end = /** @type {Range} */ (statement.range)[1];
				}
				/** @type {Borrow} */
				const borrow = {
					kind: /** @type {"borrow" | "borrowMut"} */ (marker),
					owner,
					holder,
					node,
					start: /** @type {Range} */ (node.range)[0],
					end
				};
				const list = borrowsByOwner.get(owner);
				if (list) list.push(borrow);
				else borrowsByOwner.set(owner, [borrow]);
				borrowByNode.set(node, borrow);
			}
		};

		/**
		 * A borrow may not be stored anywhere that outlives the owner.
		 * @returns {void}
		 */
		const reportEscapingBorrows = () => {
			for (const borrows of borrowsByOwner.values()) {
				for (const borrow of borrows) {
					if (!borrow.holder) continue;
					const ownerScope = borrow.owner.scope;
					for (const reference of borrow.holder.references) {
						if (!reference.isRead()) continue;
						const identifier = reference.identifier;
						const parent = parentOf(/** @type {Node} */ (identifier));
						if (!parent) continue;
						let escapes = false;
						if (
							parent.type === "ReturnStatement" &&
							parent.argument === identifier
						) {
							escapes =
								ownerScope.type === "function" ||
								isInnerScope(ownerScope, reference.from.variableScope);
						} else if (
							parent.type === "AssignmentExpression" &&
							parent.right === identifier &&
							parent.left.type === "Identifier"
						) {
							const target = referenceOf.get(parent.left);
							const targetScope =
								target && target.resolved ? target.resolved.scope : null;
							escapes = Boolean(
								targetScope && isInnerScope(ownerScope, targetScope)
							);
						}
						if (escapes) {
							context.report({
								node: /** @type {never} */ (identifier),
								messageId: "borrowEscapes",
								data: { name: borrow.owner.name }
							});
						}
					}
				}
			}
		};

		collectBorrows();

		/**
		 * @param {Identifier} node identifier that triggers the move
		 * @param {Variable} variable variable being moved
		 * @param {Node} blame node reported as the move site
		 * @returns {void}
		 */
		const recordMove = (node, variable, blame) => {
			const position = /** @type {Range} */ (node.range)[0];
			const live = liveBorrows(variable, position, borrowByNode.get(node));
			if (live.length > 0) {
				context.report({
					node: /** @type {never} */ (node),
					messageId: "moveWhileBorrowed",
					data: {
						name: variable.name,
						kind: live[0].kind === "borrowMut" ? "mutable" : "shared",
						line: lineOf(/** @type {Node} */ (live[0].node))
					}
				});
			}
			// A move inside a loop of something declared outside it is a use after
			// move on the second iteration, whatever the branch structure says.
			const declaration =
				variable.defs.length > 0 ? variable.defs[0].name : null;
			if (declaration) {
				for (
					let above = parentOf(/** @type {Node} */ (node));
					above;
					above = parentOf(above)
				) {
					if (!LOOP_TYPES.has(above.type)) continue;
					const range = /** @type {Range} */ (above.range);
					const declarationRange = /** @type {Range} */ (declaration.range);
					if (declarationRange[0] < range[0]) {
						context.report({
							node: /** @type {never} */ (node),
							messageId: "moveInLoop",
							data: { name: variable.name }
						});
					}
					break;
				}
			}
			// A closure over the owner may run any number of times, so moving from
			// inside one is the same defect as moving inside a loop.
			const crossed = functionsBetween(
				/** @type {Node} */ (node),
				variable.scope.variableScope.block
			).filter((fn) => !isImmediatelyInvoked(fn));
			if (crossed.length > 0) {
				context.report({
					node: /** @type {never} */ (node),
					messageId: "moveInClosure",
					data: { name: variable.name }
				});
			}
			const state = currentMoves();
			if (!state) return;
			state.set(variable, {
				node: blame,
				end: /** @type {Range} */ (blame.range)[1]
			});
		};

		return {
			onCodePathSegmentStart(segment) {
				/** @type {Map<Variable, MoveInfo>} */
				const state = new Map();
				// Moved in any incoming branch means moved at the merge point.
				for (const previous of segment.prevSegments) {
					const previousState = segmentMoves.get(previous.id);
					if (!previousState) continue;
					for (const [variable, info] of previousState)
						state.set(variable, info);
				}
				// A nested function starts a code path of its own with no incoming
				// segment. Seed it from where the function is written, so a closure
				// reading something already moved is caught.
				if (segment.prevSegments.length === 0) {
					const enclosing = currentMoves();
					if (enclosing) {
						for (const [variable, info] of enclosing) state.set(variable, info);
					}
				}
				segmentMoves.set(segment.id, state);
				segmentStack.push(segment);
			},

			onCodePathSegmentEnd(segment) {
				const index = segmentStack.lastIndexOf(segment);
				if (index !== -1) segmentStack.splice(index, 1);
			},

			onCodePathEnd(codePath, node) {
				// An immediately invoked function runs inline, so what it moved is
				// moved for the caller too.
				if (!FUNCTION_TYPES.has(node.type) || !isImmediatelyInvoked(node)) {
					return;
				}
				const enclosing = currentMoves();
				if (!enclosing) return;
				for (const final of codePath.finalSegments) {
					const state = segmentMoves.get(final.id);
					if (!state) continue;
					for (const [variable, info] of state) enclosing.set(variable, info);
				}
			},

			Identifier(node) {
				const reference = referenceOf.get(/** @type {Identifier} */ (node));
				if (!reference || !reference.resolved) return;
				const variable = reference.resolved;
				// Globals (`undefined`, `require`, …) have no definition to own.
				if (variable.defs.length === 0) return;
				const position = /** @type {Range} */ (node.range)[0];

				const state = currentMoves();
				const moved = state ? state.get(variable) : undefined;
				if (moved && position > moved.end) {
					context.report({
						node,
						messageId: "useAfterMove",
						data: {
							name: variable.name,
							line: lineOf(/** @type {Node} */ (moved.node))
						}
					});
					return;
				}

				const created = borrowByNode.get(/** @type {Identifier} */ (node));
				const live = liveBorrows(variable, position, created);
				if (live.length > 0) {
					const mutable = live.find((borrow) => borrow.kind === "borrowMut");
					const other = mutable || live[0];
					if (created) {
						if (created.kind === "borrowMut" || mutable) {
							context.report({
								node,
								messageId: "conflictingBorrow",
								data: {
									name: variable.name,
									kind: created.kind === "borrowMut" ? "mutable" : "shared",
									otherKind: other.kind === "borrowMut" ? "mutable" : "shared",
									line: lineOf(/** @type {Node} */ (other.node))
								}
							});
						}
					} else if (mutable) {
						context.report({
							node,
							messageId: "useWhileMutablyBorrowed",
							data: {
								name: variable.name,
								line: lineOf(/** @type {Node} */ (mutable.node))
							}
						});
					} else if (
						isMutatingUse(/** @type {Identifier} */ (node), reference)
					) {
						context.report({
							node,
							messageId: "mutationWhileShared",
							data: {
								name: variable.name,
								line: lineOf(/** @type {Node} */ (live[0].node))
							}
						});
					}
				}

				if (!reference.isRead() || isCopyVariable(variable)) return;
				const marker = markerFor(/** @type {Identifier} */ (node));
				if (marker === "move") {
					const parent = parentOf(node);
					recordMove(
						/** @type {Identifier} */ (node),
						variable,
						parent && parent.type === "VariableDeclarator" ? parent : node
					);
					return;
				}
				const call = consumingCall(/** @type {Identifier} */ (node));
				if (call) {
					recordMove(/** @type {Identifier} */ (node), variable, call);
					return;
				}
				if (isImplicitMove(/** @type {Identifier} */ (node))) {
					recordMove(/** @type {Identifier} */ (node), variable, node);
				}
			},

			"Program:exit"() {
				reportEscapingBorrows();
			}
		};
	}
};

module.exports = rule;
