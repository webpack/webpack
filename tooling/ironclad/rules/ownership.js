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
 * @property {string | null} member property moved, or null for the whole value
 * @property {boolean} blocksWholeUse whether the whole value also becomes
 * unusable — true for a Rust-style partial move, false when a call merely
 * invalidates one facet of an object that stays valid otherwise
 */

/** @typedef {Map<string | null, MoveInfo>} MovesByMember */

/**
 * What a function declares about the values handed to it, the way a Rust
 * signature does: `fn consume(s: String)` against `fn read(s: &String)`.
 * @typedef {object} Contract
 * @property {Map<number, string>} parameters marker per parameter position
 * @property {string | null} receiver marker applied to `this`
 * @property {string | null} returns marker applied to the returned value
 * @property {number[]} returnSources parameter positions (or RECEIVER_SOURCE)
 * the returned borrow lives as long as; empty when it cannot be told
 * @property {Set<number>} staticInputs positions whose borrow must be `'static`
 * @property {Set<number>} onceInputs callback positions invoked at most once,
 * which is the difference between Rust's `Fn` and `FnOnce`
 * @property {Node | null} node the function itself, or null when the contract
 * was read out of another module
 */

/**
 * The slice of typescript-eslint's parser services this rule uses. Absent
 * without type-aware linting, which is a supported configuration.
 * @typedef {object} TypeServices
 * @property {{ getTypeChecker(): import("typescript").TypeChecker }} [program] type program
 * @property {(node: Node) => import("typescript").Type} [getTypeAtLocation] type of a node
 * @property {(node: Node) => import("typescript").Symbol | undefined} [getSymbolAtLocation] symbol of a node
 */

// A JSDoc tag, so `@move` counts and `docs@move` does not. `borrowMut` comes
// first because `@borrow` would otherwise match its prefix.
const MARKER_REGEXP = /(?:^|[\s*])@(borrowMut|borrow|move|once)\b/;

// `@move config` in a function's JSDoc, naming the parameter it applies to.
const NAMED_MARKER_REGEXP =
	/(?:^|[\s*])@(borrowMut|borrow|move|once)[ \t]+([A-Za-z_$][\w$]*)(?:[ \t]+('?[A-Za-z_$][\w$]*))?/g;

// Rust's `'static`: a borrow that outlives the program, so nothing local may
// satisfy it.
const STATIC_LIFETIME = "'static";

// The lifetime of a returned borrow comes from the receiver rather than from a
// parameter position.
const RECEIVER_SOURCE = -1;

// Tokens a grouping paren may follow. A `(` after anything else opens a call
// or a parameter list, whose leading comment belongs to that, not to us.
const GROUPING_PREFIXES = new Set([
	"(",
	",",
	"=",
	"=>",
	"[",
	":",
	"?",
	"return",
	"typeof",
	"await",
	"yield"
]);

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

// Inits that produce a primitive, which is copied rather than moved. Only a
// fallback: with type information the type itself answers this.
const COPY_INIT_TYPES = new Set([
	"BinaryExpression",
	"Literal",
	"TemplateLiteral",
	"UnaryExpression",
	"UpdateExpression"
]);

/** @type {typeof import("typescript") | null} */
let typescript = null;
let typescriptLoaded = false;

/**
 * TypeScript is present whenever type-aware linting is, and absent otherwise —
 * the rule works either way, so the require is optional.
 * @returns {typeof import("typescript") | null} the TypeScript module
 */
const loadTypeScript = () => {
	if (typescriptLoaded) return typescript;
	typescriptLoaded = true;
	try {
		typescript = require("typescript");
	} catch (_err) {
		typescript = null;
	}
	return typescript;
};

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
 * Splits `"ReadableStream#getReader"` into the method and the receiver type it
 * applies to. A bare `"getReader"` applies to any receiver.
 * @param {string[]} entries configured entries
 * @returns {Map<string, string[] | null>} method to accepted type names
 */
const parseReceiverEntries = (entries) => {
	/** @type {Map<string, string[] | null>} */
	const result = new Map();
	for (const entry of entries) {
		const separator = entry.indexOf("#");
		const method = separator === -1 ? entry : entry.slice(separator + 1);
		const typeName = separator === -1 ? null : entry.slice(0, separator);
		if (!result.has(method)) {
			result.set(method, typeName === null ? null : [typeName]);
			continue;
		}
		const existing = result.get(method);
		if (existing && typeName !== null) existing.push(typeName);
		else result.set(method, null);
	}
	return result;
};

/**
 * Unions `source` into `target`: a member moved on any incoming path is moved
 * at the merge point. Inner maps are copied, never aliased.
 * @param {Map<Variable, MovesByMember>} target state to merge into
 * @param {Map<Variable, MovesByMember>} source state to merge from
 * @returns {void}
 */
const mergeMoves = (target, source) => {
	for (const [variable, byMember] of source) {
		let existing = target.get(variable);
		if (!existing) {
			existing = new Map();
			target.set(variable, existing);
		}
		for (const [member, info] of byMember) existing.set(member, info);
	}
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
					treatAssignmentAsMove: { type: "boolean" },
					consumesArguments: { type: "array", items: { type: "string" } },
					detachesTransferList: {
						type: "array",
						items: { type: "string" }
					},
					consumesReceiver: { type: "array", items: { type: "string" } },
					consumesReceiverMember: {
						type: "object",
						additionalProperties: { type: "string" }
					},
					treatDestructuringAsPartialMove: { type: "boolean" },
					callsOnce: { type: "array", items: { type: "string" } },
					locksReceiverUntil: {
						type: "object",
						additionalProperties: { type: "string" }
					}
				},
				additionalProperties: false
			}
		],
		messages: {
			useAfterMove:
				"`{{name}}` was moved on line {{line}} and cannot be used afterwards.",
			useAfterPartialMove:
				"`{{name}}.{{member}}` was moved on line {{line}} and cannot be used afterwards.",
			wholeUseAfterPartialMove:
				"`{{name}}` cannot be used as a whole: `{{name}}.{{member}}` was moved on line {{line}}.",
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
			resultIgnored:
				"this call hands back ownership of its result, so the result cannot be discarded.",
			borrowMustBeStatic:
				"`{{name}}` does not live long enough: this parameter needs a borrow that outlives the program.",
			unnameableReturnLifetime:
				"cannot tell what the returned borrow borrows from: name it, as in `@borrow return config`.",
			borrowEscapes:
				"borrow of `{{name}}` outlives it: `{{name}}` dies with this scope."
		}
	},
	create(context) {
		const sourceCode = context.sourceCode;
		const options = context.options[0] || {};
		// Calls that consume every argument. Empty by default: that is a policy,
		// not a fact about the language.
		const consumesArguments = new Set(
			/** @type {string[]} */ (options.consumesArguments) || []
		);
		// Calls that detach what reaches their transfer list. `postMessage(value)`
		// on its own structured-clones, it does not detach.
		const detachesTransferList = new Set(
			/** @type {string[]} */ (options.detachesTransferList) || [
				"postMessage",
				"structuredClone"
			]
		);
		const consumesReceiver = parseReceiverEntries(
			/** @type {string[]} */ (options.consumesReceiver) || []
		);
		// Method that locks its receiver, mapped to the method that unlocks it.
		// Read as a Map, not an object: `lockOptions.toString` would otherwise
		// inherit from Object.prototype and make every `x.toString()` a lock.
		const lockOptions = /** @type {Record<string, string>} */ (
			options.locksReceiverUntil
		) || {
			"ReadableStream#getReader": "releaseLock",
			"WritableStream#getWriter": "releaseLock"
		};
		const locksReceiverUntil = parseReceiverEntries(Object.keys(lockOptions));
		/** @type {Map<string, string>} */
		const releaseOf = new Map();
		for (const [entry, release] of Object.entries(lockOptions)) {
			const separator = entry.indexOf("#");
			releaseOf.set(
				separator === -1 ? entry : entry.slice(separator + 1),
				release
			);
		}
		// Calls that invoke their callback at most once, so a move inside it does
		// not repeat.
		const callsOnce = new Set(
			/** @type {string[]} */ (options.callsOnce) || [
				"nextTick",
				"queueMicrotask",
				"requestAnimationFrame",
				"setImmediate",
				"setTimeout"
			]
		);
		const treatAssignmentAsMove = options.treatAssignmentAsMove === true;
		const treatDestructuringAsPartialMove =
			options.treatDestructuringAsPartialMove === true;
		// Methods that consume one member of their receiver: the object stays
		// valid, that member does not. Every method consuming the same member
		// invalidates the others, which is what makes `res.text()` after
		// `res.json()` a finding while `res.status` stays fine. Only the
		// unambiguous entry is on by default — `json`/`text`/`blob` are names any
		// object may have, so they need type-aware linting to be safe.
		const memberOptions = /** @type {Record<string, string>} */ (
			options.consumesReceiverMember
		) || { "HTMLCanvasElement#transferControlToOffscreen": "getContext" };
		const consumesReceiverMember = parseReceiverEntries(
			Object.keys(memberOptions)
		);
		/** @type {Map<string, string>} */
		const memberConsumedBy = new Map();
		for (const [entry, member] of Object.entries(memberOptions)) {
			const separator = entry.indexOf("#");
			memberConsumedBy.set(
				separator === -1 ? entry : entry.slice(separator + 1),
				member
			);
		}

		// Type information narrows the tables below when it is there, and nothing
		// depends on it being there: a bare `"getReader"` entry still matches by
		// name alone.
		const services = /** @type {TypeServices | undefined} */ (
			/** @type {unknown} */ (sourceCode.parserServices)
		);
		const getTypeAtLocation =
			services && services.program && services.getTypeAtLocation
				? services.getTypeAtLocation
				: null;
		const typeChecker =
			getTypeAtLocation && services && services.program
				? services.program.getTypeChecker()
				: null;
		const ts = typeChecker ? loadTypeScript() : null;
		const copyTypeMask = ts
			? ts.TypeFlags.StringLike |
				ts.TypeFlags.NumberLike |
				ts.TypeFlags.BooleanLike |
				ts.TypeFlags.BigIntLike |
				ts.TypeFlags.ESSymbolLike |
				ts.TypeFlags.Void |
				ts.TypeFlags.Undefined |
				ts.TypeFlags.Null
			: 0;

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
		/** @type {Map<string, Map<Variable, MovesByMember>>} */
		const segmentMoves = new Map();
		/** @type {CodePathSegment[]} */
		const segmentStack = [];
		/** @type {{ node: Node, name: string, segment: CodePathSegment }[]} */
		const pendingLoopMoves = [];
		/** @type {Map<string, string>} */
		const segmentPath = new Map();
		/** @type {string[]} */
		const codePathStack = [];

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
			/** @type {Parameters<SourceCode["getCommentsBefore"]>[0]} */
			let target = /** @type {EXPECTED_ANY} */ (node);
			for (;;) {
				const comments = sourceCode.getCommentsBefore(target);
				for (let i = comments.length - 1; i >= 0; i--) {
					const match = MARKER_REGEXP.exec(comments[i].value);
					if (match) return match[1];
				}
				// ESTree drops grouping parens, so `/** @type {T} @move *\/ (a)` puts
				// the comment before a `(` that is not in the tree — step over it.
				const before = sourceCode.getTokenBefore(target);
				if (!before || before.value !== "(") return null;
				const beforeParen = sourceCode.getTokenBefore(before);
				if (beforeParen && !GROUPING_PREFIXES.has(beforeParen.value)) {
					return null;
				}
				target = before;
			}
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
		 * @returns {CodePathSegment | null} innermost reachable segment
		 */
		const currentSegment = () => {
			for (let i = segmentStack.length - 1; i >= 0; i--) {
				if (segmentStack[i].reachable) return segmentStack[i];
			}
			return null;
		};

		/**
		 * @returns {Map<Variable, MovesByMember> | null} move state of the
		 * innermost reachable segment
		 */
		const currentMoves = () => {
			const segment = currentSegment();
			return segment ? segmentMoves.get(segment.id) || null : null;
		};

		/**
		 * @param {CodePathSegment} segment segment to start from
		 * @returns {boolean} true when control can return to `segment`
		 */
		const canReachAgain = (segment) => {
			/** @type {Set<string>} */
			const seen = new Set();
			const queue = segment.nextSegments.slice();
			while (queue.length > 0) {
				const next = /** @type {CodePathSegment} */ (queue.pop());
				if (next === segment) return true;
				if (seen.has(next.id) || !next.reachable) continue;
				seen.add(next.id);
				for (const following of next.nextSegments) queue.push(following);
			}
			return false;
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
		 * @param {Node} node node to type
		 * @returns {import("typescript").Type | null} its type
		 */
		const typeAt = (node) => {
			if (!getTypeAtLocation || !typeChecker) return null;
			try {
				return getTypeAtLocation(node);
			} catch (_err) {
				// A node the parser never mapped to TypeScript — treat as unknown.
				return null;
			}
		};

		/**
		 * @param {import("typescript").Type} type type to name
		 * @returns {Set<string>} the type's own name and every base type name
		 */
		const typeNames = (type) => {
			/** @type {Set<string>} */
			const names = new Set();
			/** @type {import("typescript").Type[]} */
			const queue = type.isUnion() ? type.types.slice() : [type];
			while (queue.length > 0) {
				const current = /** @type {import("typescript").Type} */ (queue.pop());
				const symbol = current.getSymbol();
				if (symbol) {
					if (names.has(symbol.getName())) continue;
					names.add(symbol.getName());
				}
				if (current.isClassOrInterface() && typeChecker) {
					for (const base of typeChecker.getBaseTypes(current))
						queue.push(base);
				}
			}
			return names;
		};

		/**
		 * @param {Identifier} node receiver identifier
		 * @param {string[] | null} accepted type names the entry is limited to
		 * @returns {boolean} true when the entry applies to this receiver
		 */
		const receiverMatches = (node, accepted) => {
			if (accepted === null) return true;
			const type = typeAt(/** @type {Node} */ (node));
			// Without types the name alone decides, as it did before.
			if (!type) return true;
			const names = typeNames(type);
			return accepted.some((name) => names.has(name));
		};

		/**
		 * @param {Identifier} node identifier to test
		 * @param {Variable} variable its variable
		 * @returns {boolean} true when the value is copied rather than moved
		 */
		const isCopyValue = (node, variable) => {
			const type = typeAt(/** @type {Node} */ (node));
			if (!type) return isCopyVariable(variable);
			const parts = type.isUnion() ? type.types : [type];
			return parts.every((part) => (part.flags & copyTypeMask) !== 0);
		};

		/**
		 * Which member of `node` a use reads. `null` means the whole value,
		 * `undefined` means a computed access whose member cannot be named.
		 * Method names are normalized to the member they consume, so `res.text()`
		 * and `res.json()` both resolve to `body`.
		 * @param {Identifier} node identifier being used
		 * @returns {string | null | undefined} the member touched
		 */
		const memberTouched = (node) => {
			const parent = parentOf(/** @type {Node} */ (node));
			if (!parent || parent.type !== "MemberExpression") return null;
			if (parent.object !== node) return null;
			if (parent.computed) return undefined;
			if (parent.property.type !== "Identifier") return undefined;
			const name = parent.property.name;
			return memberConsumedBy.get(name) || name;
		};

		/**
		 * @param {CallExpression} call call to name
		 * @returns {string | null} the called function or method name
		 */
		const calleeName = (call) => {
			const callee = call.callee;
			if (callee.type === "Identifier") return callee.name;
			if (
				callee.type === "MemberExpression" &&
				!callee.computed &&
				callee.property.type === "Identifier"
			) {
				return callee.property.name;
			}
			return null;
		};

		/**
		 * `stream.getReader()`, `canvas.transferControlToOffscreen()` — the call
		 * acts on the object it is called on rather than on an argument.
		 * @param {Identifier} node identifier to test
		 * @returns {{ call: CallExpression, name: string } | null} the call
		 */
		const receiverCall = (node) => {
			const member = parentOf(/** @type {Node} */ (node));
			if (
				!member ||
				member.type !== "MemberExpression" ||
				member.object !== node ||
				member.computed ||
				member.property.type !== "Identifier"
			) {
				return null;
			}
			const call = parentOf(member);
			if (!call || call.type !== "CallExpression" || call.callee !== member) {
				return null;
			}
			return { call, name: member.property.name };
		};

		/**
		 * A value is consumed when every argument of the call is consumed, when it
		 * reaches a transfer list, or when the call consumes its receiver.
		 * @param {Identifier} node identifier to test
		 * @returns {CallExpression | null} the consuming call
		 */
		const consumingCall = (node) => {
			const receiver = receiverCall(node);
			if (
				receiver &&
				consumesReceiver.has(receiver.name) &&
				receiverMatches(node, consumesReceiver.get(receiver.name) || null)
			) {
				return receiver.call;
			}

			let argument = /** @type {Node} */ (node);
			let parent = parentOf(argument);
			let transferred = false;
			// `postMessage(value, [buffer])` and `structuredClone(value, {
			// transfer: [buffer] })` both detach what the array holds.
			if (parent && parent.type === "ArrayExpression") {
				argument = parent;
				parent = parentOf(argument);
				transferred = true;
				if (parent && parent.type === "Property" && parent.value === argument) {
					transferred =
						parent.key.type === "Identifier"
							? parent.key.name === "transfer"
							: false;
					argument = /** @type {Node} */ (parentOf(parent));
					parent = parentOf(argument);
				}
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
			const name = calleeName(parent);
			if (!name) return null;
			if (consumesArguments.has(name)) return parent;
			return transferred && detachesTransferList.has(name) ? parent : null;
		};

		/**
		 * `res.json()` consumes the response body but leaves the response usable.
		 * @param {Identifier} node receiver identifier
		 * @returns {{ call: CallExpression, member: string } | null} the call
		 */
		const consumedReceiverMember = (node) => {
			const receiver = receiverCall(node);
			if (!receiver || !consumesReceiverMember.has(receiver.name)) return null;
			if (
				!receiverMatches(
					node,
					consumesReceiverMember.get(receiver.name) || null
				)
			) {
				return null;
			}
			const member = memberConsumedBy.get(receiver.name);
			return member ? { call: receiver.call, member } : null;
		};

		/**
		 * `const { x, y } = data` moves the fields it names, the way Rust reads a
		 * destructuring pattern. A rest element is skipped: what it takes cannot
		 * be named.
		 * @param {Identifier} node identifier on the right of the pattern
		 * @returns {{ members: string[], blame: Node } | null} moved fields
		 */
		const destructuredMembers = (node) => {
			if (!treatDestructuringAsPartialMove) return null;
			const parent = parentOf(/** @type {Node} */ (node));
			if (
				!parent ||
				parent.type !== "VariableDeclarator" ||
				parent.init !== node ||
				parent.id.type !== "ObjectPattern"
			) {
				return null;
			}
			/** @type {string[]} */
			const members = [];
			for (const property of parent.id.properties) {
				if (property.type !== "Property" || property.computed) continue;
				if (property.key.type === "Identifier") {
					members.push(property.key.name);
				} else if (
					property.key.type === "Literal" &&
					typeof property.key.value === "string"
				) {
					members.push(property.key.value);
				}
			}
			return members.length > 0 ? { members, blame: parent } : null;
		};

		/** @type {Map<import("typescript").Node, Contract | null>} */
		const foreignContracts = new Map();

		/**
		 * A contract in another module is still a contract. typescript-eslint
		 * hands over the whole program, so the callee's declaration — and the
		 * JSDoc on it — can be read wherever it lives.
		 * @param {Node} callee callee node
		 * @returns {Contract | null} the contract declared where the callee is
		 */
		const foreignContractOf = (callee) => {
			if (!services || !typeChecker || !ts) return null;
			const getSymbol = services.getSymbolAtLocation;
			if (!getSymbol) return null;
			let symbol;
			try {
				symbol = getSymbol(callee);
			} catch (_err) {
				return null;
			}
			if (!symbol) return null;
			if (symbol.flags & ts.SymbolFlags.Alias) {
				symbol = typeChecker.getAliasedSymbol(symbol);
			}
			for (const declaration of symbol.getDeclarations() || []) {
				if (foreignContracts.has(declaration)) {
					const cached = foreignContracts.get(declaration);
					if (cached) return cached;
					continue;
				}
				const contract = contractFromTypeScript(declaration);
				foreignContracts.set(declaration, contract);
				if (contract) return contract;
			}
			return null;
		};

		/**
		 * @param {import("typescript").Declaration} declaration declaration to read
		 * @returns {Contract | null} what it declares about its inputs
		 */
		const contractFromTypeScript = (declaration) => {
			const compiler = /** @type {typeof import("typescript")} */ (ts);
			let signature = /** @type {EXPECTED_ANY} */ (declaration);
			// `const consume = (a) => {}` documents the declaration, not the arrow.
			if (signature.initializer && signature.initializer.parameters) {
				signature = signature.initializer;
			}
			if (!signature.parameters) return null;
			const sourceFile = declaration.getSourceFile();
			const text = sourceFile.text;
			/** @type {(string | null)[]} */
			const parameterNames = [];
			/** @type {Map<number, string>} */
			const inlineMarkers = new Map();
			for (const [index, parameter] of signature.parameters.entries()) {
				const name =
					parameter.name &&
					parameter.name.kind === compiler.SyntaxKind.Identifier
						? parameter.name.text
						: null;
				parameterNames.push(name);
				// The trivia before the parameter, read raw: TypeScript counts a
				// comment right after `(` as trailing the paren, not leading the
				// parameter, so getLeadingCommentRanges misses `(/** @move *\/ a)`.
				const match = MARKER_REGEXP.exec(
					text.slice(parameter.pos, parameter.getStart(sourceFile))
				);
				if (match) inlineMarkers.set(index, match[1]);
			}
			/** @type {[string, string, string | undefined][]} */
			const declarations = [];
			for (const tag of compiler.getJSDocTags(declaration)) {
				const marker = tag.tagName.text;
				if (
					marker !== "move" &&
					marker !== "borrow" &&
					marker !== "borrowMut"
				) {
					continue;
				}
				const comment =
					typeof tag.comment === "string"
						? tag.comment
						: (tag.comment || []).map((part) => part.text || "").join("");
				const parts = comment.trim().split(/\s+/);
				if (parts.length === 0 || parts[0] === "") continue;
				declarations.push([marker, parts[0], parts[1]]);
			}
			return buildContract(parameterNames, inlineMarkers, declarations, null);
		};

		/**
		 * @param {CallExpression} call call to resolve
		 * @returns {Contract | null} the callee's contract, when it is declared in
		 * this file
		 */
		const contractOfCall = (call) => {
			const callee = /** @type {import("estree").Expression} */ (call.callee);
			if (callee.type === "Identifier") {
				const reference = referenceOf.get(callee);
				const resolved = reference && reference.resolved;
				const local = resolved && contractByFunction.get(resolved);
				if (local) return local;
			} else if (
				callee.type === "MemberExpression" &&
				!callee.computed &&
				callee.property.type === "Identifier"
			) {
				const local = contractByMethodName.get(callee.property.name);
				if (local) return local;
			}
			return foreignContractOf(/** @type {Node} */ (callee));
		};

		/**
		 * The variable a call's result is stored in, which is what a returned
		 * borrow is held by.
		 * @param {CallExpression} call call whose result is stored
		 * @returns {Variable | null} the holder
		 */
		const resultHolder = (call) => {
			let current = /** @type {Node} */ (call);
			let parent = parentOf(current);
			// `const r = await f(x)` holds the borrow just the same.
			while (parent && parent.type === "AwaitExpression") {
				current = parent;
				parent = parentOf(current);
			}
			if (!parent || parent.type !== "VariableDeclarator") return null;
			if (parent.init !== current) return null;
			const declared = sourceCode.getDeclaredVariables(parent);
			return declared.length === 1 ? declared[0] : null;
		};

		/**
		 * Rust states ownership at the signature, so the call site needs no
		 * marker: the contract of the callee decides what happens to each
		 * argument.
		 * @param {Identifier} node identifier in argument or receiver position
		 * @returns {{ marker: string, call: CallExpression, contract: Contract,
		 * position: number } | null} what the callee declares about this value
		 */
		const declaredByCallee = (node) => {
			const parent = parentOf(/** @type {Node} */ (node));
			if (!parent) return null;

			// `obj.method()` where the method declares `@move this`.
			const receiver = receiverCall(node);
			if (receiver) {
				const contract = contractByMethodName.get(receiver.name);
				if (contract && contract.receiver) {
					return {
						marker: contract.receiver,
						call: receiver.call,
						contract,
						position: RECEIVER_SOURCE
					};
				}
			}

			if (parent.type !== "CallExpression" && parent.type !== "NewExpression") {
				return null;
			}
			const index = parent.arguments.indexOf(
				/** @type {import("estree").Expression} */ (/** @type {Node} */ (node))
			);
			if (index === -1) return null;
			const contract = contractOfCall(parent);
			if (!contract) return null;
			const marker = contract.parameters.get(index);
			return marker
				? { marker, call: parent, contract, position: index }
				: null;
		};

		/**
		 * @param {Identifier} node identifier being consumed
		 * @returns {boolean} true when a bare `let b = a` should move
		 */
		const isImplicitMove = (node) => {
			if (!treatAssignmentAsMove) return false;
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

		/**
		 * @param {Borrow} borrow borrow to register
		 * @returns {void}
		 */
		const addBorrow = (borrow) => {
			const list = borrowsByOwner.get(borrow.owner);
			if (list) list.push(borrow);
			else borrowsByOwner.set(borrow.owner, [borrow]);
			borrowByNode.set(borrow.node, borrow);
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
				addBorrow(borrow);
			}
			collectLocks();
			collectDeclaredBorrows();
		};

		/**
		 * A parameter declared `@borrow` or `@borrowMut` borrows its argument for
		 * the duration of the call, so passing the same value twice, or passing it
		 * while it is already borrowed, is a conflict.
		 * @returns {void}
		 */
		const collectDeclaredBorrows = () => {
			for (const [node, reference] of referenceOf) {
				const owner = reference.resolved;
				if (!owner || !reference.isRead() || borrowByNode.has(node)) continue;
				const declared = declaredByCallee(node);
				if (!declared || declared.marker === "move") continue;
				// `'static` outlives the program, so only something declared at the
				// top level can be borrowed for it.
				if (
					declared.contract.staticInputs.has(declared.position) &&
					owner.scope.variableScope.block.type !== "Program"
				) {
					staticViolations.push({ node, name: owner.name });
				}
				let end = /** @type {Range} */ (declared.call.range)[1];
				/** @type {Variable | null} */
				let holder = null;
				// `@borrow return` means the output carries the input's lifetime, so
				// the borrow lives as long as whatever holds the result.
				const { contract } = declared;
				if (
					contract.returns !== null &&
					contract.returns !== "move" &&
					contract.returnSources.includes(declared.position)
				) {
					holder = resultHolder(declared.call);
					if (holder) {
						for (const holderReference of holder.references) {
							const range = /** @type {Range} */ (
								holderReference.identifier.range
							);
							if (range[1] > end) end = range[1];
						}
					}
				}
				addBorrow({
					kind: /** @type {"borrow" | "borrowMut"} */ (declared.marker),
					owner,
					holder,
					node,
					start: /** @type {Range} */ (node.range)[0],
					end
				});
			}
		};

		/**
		 * `stream.getReader()` locks the stream until `releaseLock()` — an
		 * exclusive borrow the platform enforces at runtime, so it needs no
		 * marker. Unlike a marker borrow it is lexical, not ended by last use:
		 * an unreleased lock is still held.
		 * @returns {void}
		 */
		const collectLocks = () => {
			for (const [node, reference] of referenceOf) {
				const owner = reference.resolved;
				if (!owner || !reference.isRead()) continue;
				const receiver = receiverCall(node);
				if (!receiver) continue;
				if (!locksReceiverUntil.has(receiver.name)) continue;
				if (
					!receiverMatches(node, locksReceiverUntil.get(receiver.name) || null)
				) {
					continue;
				}
				const release = releaseOf.get(receiver.name);
				if (!release) continue;
				const declarator = parentOf(receiver.call);
				const declared =
					declarator && declarator.type === "VariableDeclarator"
						? sourceCode.getDeclaredVariables(declarator)
						: [];
				const holder = declared.length === 1 ? declared[0] : null;
				let end = /** @type {Range} */ (
					owner.scope.variableScope.block.range
				)[1];
				if (holder) {
					for (const holderReference of holder.references) {
						const released = receiverCall(
							/** @type {Identifier} */ (holderReference.identifier)
						);
						if (released && released.name === release) {
							end = /** @type {Range} */ (released.call.range)[1];
							break;
						}
					}
				}
				addBorrow({
					kind: "borrowMut",
					owner,
					holder,
					node,
					start: /** @type {Range} */ (node.range)[0],
					end
				});
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
							parent.left.type === "MemberExpression" &&
							parent.left.object.type === "ThisExpression"
						) {
							// `this.field = view` keeps the borrow for as long as the
							// instance. A parameter is the struct case and is fine; a
							// local dies with the method.
							const definition = borrow.owner.defs[0];
							escapes = Boolean(
								definition &&
								definition.type !== "Parameter" &&
								ownerScope.variableScope.block.type !== "Program"
							);
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

		/**
		 * A function's own JSDoc block sits before the declaration, or before the
		 * statement, property or class member that carries it.
		 * @param {Node} node function node
		 * @returns {Node} node whose leading comment documents it
		 */
		const documentedNode = (node) => {
			let current = node;
			for (let above = parentOf(current); above; above = parentOf(current)) {
				if (
					above.type === "VariableDeclarator" ||
					above.type === "VariableDeclaration" ||
					above.type === "Property" ||
					above.type === "MethodDefinition" ||
					above.type === "PropertyDefinition" ||
					above.type === "ExportNamedDeclaration" ||
					above.type === "ExportDefaultDeclaration"
				) {
					current = above;
					continue;
				}
				break;
			}
			return current;
		};

		/**
		 * @param {Node} node function node
		 * @returns {Contract | null} what the function declares about its inputs
		 */
		/**
		 * Builds a contract from what a signature says, whichever syntax tree it
		 * was read out of — this file's or another module's.
		 * @param {(string | null)[]} parameterNames name per parameter position
		 * @param {Map<number, string>} inlineMarkers markers written on parameters
		 * @param {[string, string, string | undefined][]} declarations marker,
		 * target and optional source or lifetime, from the doc block
		 * @param {Node | null} node the function, when it is in this file
		 * @returns {Contract | null} the contract, or null when nothing is declared
		 */
		const buildContract = (
			parameterNames,
			inlineMarkers,
			declarations,
			node
		) => {
			/** @type {Map<number, string>} */
			const byPosition = new Map();
			/** @type {Set<number>} */
			const onceInputs = new Set();
			for (const [position, marker] of inlineMarkers) {
				if (marker === "once") onceInputs.add(position);
				else byPosition.set(position, marker);
			}
			/** @type {Map<string, number>} */
			const positionOfName = new Map();
			for (const [index, name] of parameterNames.entries()) {
				if (name !== null) positionOfName.set(name, index);
			}
			/** @type {string | null} */
			let receiver = null;
			/** @type {string | null} */
			let returns = null;
			/** @type {string | null} */
			let returnSourceName = null;
			/** @type {Map<number, string>} */
			const lifetimeOfPosition = new Map();
			/** @type {Set<number>} */
			const staticInputs = new Set();
			/** @type {string | null} */
			let receiverLifetime = null;
			for (const [marker, name, source] of declarations) {
				const lifetime = source && source.charAt(0) === "'" ? source : null;
				if (name === "return") {
					returns = marker;
					if (lifetime) returnSourceName = lifetime;
					else if (source && positionOfName.has(source)) {
						returnSourceName = source;
					} else if (source === "this") returnSourceName = "this";
				} else if (name === "this") {
					receiver = marker;
					receiverLifetime = lifetime;
					if (lifetime === STATIC_LIFETIME) staticInputs.add(RECEIVER_SOURCE);
				} else if (positionOfName.has(name)) {
					const position = /** @type {number} */ (positionOfName.get(name));
					if (marker === "once") {
						onceInputs.add(position);
						continue;
					}
					byPosition.set(position, marker);
					if (lifetime) lifetimeOfPosition.set(position, lifetime);
					if (lifetime === STATIC_LIFETIME) staticInputs.add(position);
				}
			}
			if (
				byPosition.size === 0 &&
				onceInputs.size === 0 &&
				receiver === null &&
				returns === null
			) {
				return null;
			}
			/** @type {number[]} */
			let returnSources = [];
			if (returns !== null && returns !== "move") {
				if (returnSourceName !== null && returnSourceName.charAt(0) === "'") {
					// A named lifetime may tie the output to several inputs at once,
					// which is `fn longest<'a>(x: &'a str, y: &'a str) -> &'a str`.
					for (const [position, lifetime] of lifetimeOfPosition) {
						if (lifetime === returnSourceName) returnSources.push(position);
					}
					if (receiverLifetime === returnSourceName) {
						returnSources.push(RECEIVER_SOURCE);
					}
				} else if (returnSourceName === "this") {
					returnSources = [RECEIVER_SOURCE];
				} else if (returnSourceName !== null) {
					returnSources = [
						/** @type {number} */ (positionOfName.get(returnSourceName))
					];
				} else {
					// Rust's elision: with exactly one borrowed input the output
					// borrows from it, and anything else needs saying explicitly.
					const candidates = [...byPosition]
						.filter(([, marker]) => marker !== "move")
						.map(([index]) => index);
					if (receiver !== null && receiver !== "move") {
						candidates.push(RECEIVER_SOURCE);
					}
					returnSources = candidates.length === 1 ? candidates : [];
				}
			}
			return {
				parameters: byPosition,
				receiver,
				returns,
				returnSources,
				staticInputs,
				onceInputs,
				node
			};
		};

		/**
		 * Rust's `FnOnce`: a callback the callee promises to invoke at most once
		 * cannot repeat what it moves, so it is not a `moveInClosure`.
		 * @param {Node} fn function passed as an argument
		 * @returns {boolean} true when it is called at most once
		 */
		const isCalledOnce = (fn) => {
			const parent = parentOf(fn);
			if (
				!parent ||
				(parent.type !== "CallExpression" && parent.type !== "NewExpression")
			) {
				return false;
			}
			const index = parent.arguments.indexOf(
				/** @type {import("estree").Expression} */ (fn)
			);
			if (index === -1) return false;
			const name = calleeName(/** @type {CallExpression} */ (parent));
			if (name && callsOnce.has(name)) return true;
			const contract = contractOfCall(/** @type {CallExpression} */ (parent));
			return Boolean(contract && contract.onceInputs.has(index));
		};

		/**
		 * @param {Node} node function node
		 * @returns {Contract | null} what the function declares about its inputs
		 */
		const contractOf = (node) => {
			const parameters = /** @type {import("estree").Function} */ (node).params;
			/** @type {(string | null)[]} */
			const parameterNames = [];
			/** @type {Map<number, string>} */
			const inlineMarkers = new Map();
			for (const [index, parameter] of parameters.entries()) {
				if (parameter.type !== "Identifier") {
					parameterNames.push(null);
					continue;
				}
				parameterNames.push(parameter.name);
				const marker = markerBefore(parameter);
				if (marker) inlineMarkers.set(index, marker);
			}
			/** @type {[string, string, string | undefined][]} */
			const declarations = [];
			// The block form names what it applies to: `@move config`,
			// `@move this`, `@borrow return`, `@borrow return config`.
			for (const comment of sourceCode.getCommentsBefore(
				/** @type {Parameters<SourceCode["getCommentsBefore"]>[0]} */ (
					documentedNode(node)
				)
			)) {
				NAMED_MARKER_REGEXP.lastIndex = 0;
				let match;
				while ((match = NAMED_MARKER_REGEXP.exec(comment.value)) !== null) {
					declarations.push([match[1], match[2], match[3]]);
				}
			}
			return buildContract(parameterNames, inlineMarkers, declarations, node);
		};

		/** @type {Map<Variable, Contract>} */
		const contractByFunction = new Map();
		/** @type {Map<string, Contract | null>} */
		const contractByMethodName = new Map();

		/**
		 * @returns {void}
		 */
		const collectContracts = () => {
			for (const node of parents.keys()) {
				if (!FUNCTION_TYPES.has(node.type)) continue;
				const contract = contractOf(node);
				if (!contract) continue;
				const id =
					node.type === "FunctionDeclaration" ||
					node.type === "FunctionExpression"
						? node.id
						: null;
				if (id) {
					// `function consume(a) {}` declares `consume` and its parameters
					// alike, so keep only the function's own name.
					for (const variable of sourceCode.getDeclaredVariables(node)) {
						if (variable.name === id.name) {
							contractByFunction.set(variable, contract);
						}
					}
				}
				const holder = parentOf(node);
				// `struct Parser<'a>` is spelled as a contract on the constructor,
				// so `new Parser(x)` has to find it through the class's own name.
				if (
					holder &&
					holder.type === "MethodDefinition" &&
					holder.kind === "constructor"
				) {
					const body = parentOf(holder);
					const classNode = body && parentOf(body);
					if (classNode) {
						for (const variable of sourceCode.getDeclaredVariables(
							/** @type {import("estree").ClassDeclaration} */ (classNode)
						)) {
							contractByFunction.set(variable, contract);
						}
					}
				}
				if (holder && holder.type === "VariableDeclarator") {
					const declared = sourceCode.getDeclaredVariables(holder);
					if (declared.length === 1) {
						contractByFunction.set(declared[0], contract);
					}
				}
				// A method is reached through a receiver whose declaration this rule
				// cannot see, so it is matched by name — and only when the name is
				// unambiguous within the file.
				if (
					holder &&
					(holder.type === "MethodDefinition" ||
						holder.type === "Property" ||
						holder.type === "PropertyDefinition") &&
					!holder.computed &&
					holder.key.type === "Identifier"
				) {
					const name = holder.key.name;
					contractByMethodName.set(
						name,
						contractByMethodName.has(name) ? null : contract
					);
				}
			}
		};

		/** @type {Node[]} */
		const unnameableReturnBorrows = [];
		/** @type {{ node: Identifier, name: string }[]} */
		const staticViolations = [];

		collectContracts();
		for (const contract of new Set([
			...contractByFunction.values(),
			.../** @type {Contract[]} */ (
				[...contractByMethodName.values()].filter(Boolean)
			)
		])) {
			if (
				contract.node !== null &&
				contract.returns !== null &&
				contract.returns !== "move" &&
				contract.returnSources.length === 0
			) {
				unnameableReturnBorrows.push(contract.node);
			}
		}
		collectBorrows();

		/**
		 * @param {Identifier} node identifier that triggers the move
		 * @param {Variable} variable variable being moved
		 * @param {Node} blame node reported as the move site
		 * @param {string | null} member member moved, or null for the whole value
		 * @param {boolean} blocksWholeUse whether the whole value dies with it
		 * @returns {void}
		 */
		const recordMove = (node, variable, blame, member, blocksWholeUse) => {
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
			// move on the next iteration — but only if the move can be reached
			// twice. `break` right after it means it cannot, so the verdict waits
			// until the segment graph is complete.
			const declaration =
				variable.defs.length > 0 ? variable.defs[0].name : null;
			const segment = currentSegment();
			if (declaration && segment) {
				for (
					let above = parentOf(/** @type {Node} */ (node));
					above;
					above = parentOf(above)
				) {
					if (!LOOP_TYPES.has(above.type)) continue;
					const range = /** @type {Range} */ (above.range);
					const declarationRange = /** @type {Range} */ (declaration.range);
					if (declarationRange[0] < range[0]) {
						pendingLoopMoves.push({
							node: /** @type {Node} */ (node),
							name: variable.name,
							segment
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
			).filter((fn) => !isImmediatelyInvoked(fn) && !isCalledOnce(fn));
			if (crossed.length > 0) {
				context.report({
					node: /** @type {never} */ (node),
					messageId: "moveInClosure",
					data: { name: variable.name }
				});
			}
			const state = currentMoves();
			if (!state) return;
			let byMember = state.get(variable);
			if (!byMember) {
				byMember = new Map();
				state.set(variable, byMember);
			}
			byMember.set(member, {
				node: blame,
				end: /** @type {Range} */ (blame.range)[1],
				member,
				blocksWholeUse
			});
		};

		return {
			onCodePathSegmentStart(segment) {
				/** @type {Map<Variable, MovesByMember>} */
				const state = new Map();
				// Moved in any incoming branch means moved at the merge point.
				for (const previous of segment.prevSegments) {
					const previousState = segmentMoves.get(previous.id);
					if (!previousState) continue;
					mergeMoves(state, previousState);
				}
				// A nested function starts a code path of its own with no incoming
				// segment. Seed it from where the function is written, so a closure
				// reading something already moved is caught.
				if (segment.prevSegments.length === 0) {
					const enclosing = currentMoves();
					if (enclosing) mergeMoves(state, enclosing);
				}
				segmentMoves.set(segment.id, state);
				segmentPath.set(segment.id, codePathStack[codePathStack.length - 1]);
				segmentStack.push(segment);
			},

			onCodePathSegmentEnd(segment) {
				const index = segmentStack.lastIndexOf(segment);
				if (index !== -1) segmentStack.splice(index, 1);
				// `finally` is the one shape where a segment of the same code path
				// stays open around another: the continuation segment starts before
				// the finally body, so it is not listed as a successor and has to be
				// updated by hand.
				const path = segmentPath.get(segment.id);
				const state = segmentMoves.get(segment.id);
				if (!state) return;
				for (let i = segmentStack.length - 1; i >= 0; i--) {
					const open = segmentStack[i];
					if (segmentPath.get(open.id) !== path) continue;
					const target = segmentMoves.get(open.id);
					if (target) mergeMoves(target, state);
					break;
				}
			},

			onCodePathStart(codePath) {
				codePathStack.push(codePath.id);
			},

			onCodePathEnd(codePath, node) {
				codePathStack.pop();
				// An immediately invoked function runs inline, so what it moved is
				// moved for the caller too.
				if (!FUNCTION_TYPES.has(node.type) || !isImmediatelyInvoked(node)) {
					return;
				}
				const enclosing = currentMoves();
				if (!enclosing) return;
				for (const final of codePath.finalSegments) {
					const state = segmentMoves.get(final.id);
					if (state) mergeMoves(enclosing, state);
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
				const byMember = state ? state.get(variable) : undefined;
				if (byMember) {
					const whole = byMember.get(null);
					if (whole && position > whole.end) {
						context.report({
							node,
							messageId: "useAfterMove",
							data: {
								name: variable.name,
								line: lineOf(/** @type {Node} */ (whole.node))
							}
						});
						return;
					}
					const touched = memberTouched(/** @type {Identifier} */ (node));
					if (touched === null) {
						// A whole-value use is only blocked by a real partial move; a
						// consumed facet leaves the object itself usable.
						for (const info of byMember.values()) {
							if (!info.blocksWholeUse || position <= info.end) continue;
							context.report({
								node,
								messageId: "wholeUseAfterPartialMove",
								data: {
									name: variable.name,
									member: /** @type {string} */ (info.member),
									line: lineOf(/** @type {Node} */ (info.node))
								}
							});
							return;
						}
					} else if (touched !== undefined) {
						const info = byMember.get(touched);
						if (info && position > info.end) {
							context.report({
								node,
								messageId: "useAfterPartialMove",
								data: {
									name: variable.name,
									member: touched,
									line: lineOf(/** @type {Node} */ (info.node))
								}
							});
							return;
						}
					}
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

				if (
					!reference.isRead() ||
					isCopyValue(/** @type {Identifier} */ (node), variable)
				) {
					return;
				}
				const marker = markerFor(/** @type {Identifier} */ (node));
				if (marker === "move") {
					const parent = parentOf(node);
					// `/** @move *\/ data.x` moves the field, not the object.
					const marked = memberTouched(/** @type {Identifier} */ (node));
					const member = typeof marked === "string" ? marked : null;
					const blame =
						parent && parent.type === "VariableDeclarator" ? parent : node;
					recordMove(
						/** @type {Identifier} */ (node),
						variable,
						blame,
						member,
						true
					);
					return;
				}
				const declared = declaredByCallee(/** @type {Identifier} */ (node));
				if (declared && declared.marker === "move") {
					recordMove(
						/** @type {Identifier} */ (node),
						variable,
						declared.call,
						null,
						true
					);
					return;
				}
				const consumedMember = consumedReceiverMember(
					/** @type {Identifier} */ (node)
				);
				if (consumedMember) {
					recordMove(
						/** @type {Identifier} */ (node),
						variable,
						consumedMember.call,
						consumedMember.member,
						false
					);
					return;
				}
				const call = consumingCall(/** @type {Identifier} */ (node));
				if (call) {
					recordMove(
						/** @type {Identifier} */ (node),
						variable,
						call,
						null,
						true
					);
					return;
				}
				const destructured = destructuredMembers(
					/** @type {Identifier} */ (node)
				);
				if (destructured) {
					for (const member of destructured.members) {
						recordMove(
							/** @type {Identifier} */ (node),
							variable,
							destructured.blame,
							member,
							true
						);
					}
					return;
				}
				if (isImplicitMove(/** @type {Identifier} */ (node))) {
					recordMove(
						/** @type {Identifier} */ (node),
						variable,
						node,
						null,
						true
					);
				}
			},

			/**
			 * @param {CallExpression | import("estree").NewExpression} node call
			 * @returns {void}
			 */
			"CallExpression, NewExpression"(node) {
				const contract = contractOfCall(
					/** @type {CallExpression} */ (/** @type {unknown} */ (node))
				);
				if (!contract || contract.returns !== "move") return;
				const parent = parentOf(/** @type {Node} */ (node));
				if (parent && parent.type === "ExpressionStatement") {
					context.report({ node, messageId: "resultIgnored" });
				}
			},

			"Program:exit"() {
				for (const violation of staticViolations) {
					context.report({
						node: /** @type {never} */ (violation.node),
						messageId: "borrowMustBeStatic",
						data: { name: violation.name }
					});
				}
				for (const node of unnameableReturnBorrows) {
					context.report({
						node: /** @type {never} */ (node),
						messageId: "unnameableReturnLifetime"
					});
				}
				reportEscapingBorrows();
				for (const pending of pendingLoopMoves) {
					if (!canReachAgain(pending.segment)) continue;
					context.report({
						node: /** @type {never} */ (pending.node),
						messageId: "moveInLoop",
						data: { name: pending.name }
					});
				}
			}
		};
	}
};

module.exports = rule;
