/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

/**
 * @import {
 * 	Function as ESTreeFunction,
 * 	Identifier,
 * 	Node,
 * 	Program
 * } from "estree"
 */

/**
 * @typedef {"global" | "module" | "function" | "function-expression-name" | "block" | "switch" | "catch" | "with" | "for" | "class" | "class-field-initializer" | "class-static-block"} ScopeType
 */

/**
 * Acorn records every node's offset as `start`, but the nodes are typed as
 * `estree`, which models the spec and has only the optional `range`/`loc`.
 * Intersect with this to read the offset the parser really wrote.
 * @typedef {{ start: number }} Offset
 */

/**
 * A node's visitable slots, as `CHILD_KEYS` names them.
 * @typedef {Record<string, Node | Node[] | null | undefined>} NodeChildren
 */

/**
 * Child properties to visit for node types with no special scoping or
 * referencing behaviour. Types handled by the walker's `switch` never reach
 * this table.
 * @type {Record<string, string[]>}
 */
const CHILD_KEYS = {
	ArrayExpression: ["elements"],
	ArrayPattern: ["elements"],
	ArrowFunctionExpression: ["params", "body"],
	AssignmentExpression: ["left", "right"],
	AssignmentPattern: ["left", "right"],
	AwaitExpression: ["argument"],
	BinaryExpression: ["left", "right"],
	BlockStatement: ["body"],
	BreakStatement: ["label"],
	CallExpression: ["callee", "arguments"],
	CatchClause: ["param", "body"],
	ChainExpression: ["expression"],
	ClassBody: ["body"],
	ClassDeclaration: ["id", "superClass", "body"],
	ClassExpression: ["id", "superClass", "body"],
	ConditionalExpression: ["test", "consequent", "alternate"],
	ContinueStatement: ["label"],
	DoWhileStatement: ["body", "test"],
	EmptyStatement: [],
	ExportAllDeclaration: ["source"],
	ExportDefaultDeclaration: ["declaration"],
	ExportNamedDeclaration: ["declaration", "specifiers", "source"],
	ExportSpecifier: ["exported", "local"],
	ExpressionStatement: ["expression"],
	ForInStatement: ["left", "right", "body"],
	ForOfStatement: ["left", "right", "body"],
	ForStatement: ["init", "test", "update", "body"],
	FunctionDeclaration: ["id", "params", "body"],
	FunctionExpression: ["id", "params", "body"],
	Identifier: [],
	IfStatement: ["test", "consequent", "alternate"],
	ImportDeclaration: ["specifiers", "source"],
	ImportDefaultSpecifier: ["local"],
	ImportExpression: ["source", "options"],
	ImportNamespaceSpecifier: ["local"],
	ImportSpecifier: ["imported", "local"],
	LabeledStatement: ["label", "body"],
	Literal: [],
	LogicalExpression: ["left", "right"],
	MemberExpression: ["object", "property"],
	MetaProperty: ["meta", "property"],
	MethodDefinition: ["key", "value"],
	NewExpression: ["callee", "arguments"],
	ObjectExpression: ["properties"],
	ObjectPattern: ["properties"],
	PrivateIdentifier: [],
	Program: ["body"],
	Property: ["key", "value"],
	PropertyDefinition: ["key", "value"],
	RestElement: ["argument"],
	ReturnStatement: ["argument"],
	SequenceExpression: ["expressions"],
	SpreadElement: ["argument"],
	StaticBlock: ["body"],
	Super: [],
	SwitchCase: ["test", "consequent"],
	SwitchStatement: ["discriminant", "cases"],
	TaggedTemplateExpression: ["tag", "quasi"],
	TemplateElement: [],
	TemplateLiteral: ["quasis", "expressions"],
	ThisExpression: [],
	ThrowStatement: ["argument"],
	TryStatement: ["block", "handler", "finalizer"],
	UnaryExpression: ["argument"],
	UpdateExpression: ["argument"],
	VariableDeclaration: ["declarations"],
	VariableDeclarator: ["id", "init"],
	WhileStatement: ["test", "body"],
	WithStatement: ["object", "body"],
	YieldExpression: ["argument"]
};

/**
 * A lexical scope. One shape for every kind, so the property loads in the
 * resolution loop stay monomorphic.
 */
class Scope {
	/**
	 * @param {ScopeType} type what opened this scope
	 * @param {Node} block the node that opened this scope
	 * @param {Scope | null} upper the enclosing scope
	 * @param {boolean} isVarScope whether `var` and function declarations hoist to here
	 * @param {boolean} recordEveryReference whether every binding collects its references, not only the ones webpack reads
	 */
	constructor(type, block, upper, isVarScope, recordEveryReference) {
		/** @type {ScopeType} */
		this.type = type;
		/** @type {Node} */
		this.block = block;
		/** @type {Scope | null} */
		this.upper = upper;
		/** @type {Scope[]} */
		this.childScopes = NO_CHILD_SCOPES;
		/** @type {Variable[]} */
		this.variables = NO_VARIABLE_LIST;
		/** @type {Map<string, Variable> | undefined} the index, once this scope outgrows a scan */
		this._index = undefined;
		/** @type {Scope} the nearest enclosing scope `var` hoists to */
		this.variableScope = isVarScope
			? this
			: /** @type {Scope} */ (upper).variableScope;
		/**
		 * For a function scope with parameters, the offset where its body
		 * starts; `-1` for every other scope. Separates the two regions that
		 * share this scope, so a reference in the parameter list can be kept
		 * from resolving to a binding declared in the body — see
		 * `isHiddenBodyBinding`.
		 * @type {number}
		 */
		this.paramBoundary = -1;
		/**
		 * Whether this scope's bindings collect their references — only the
		 * module scope and its direct children are ever asked. See `_resolve`.
		 * @type {boolean}
		 */
		this._recorded =
			recordEveryReference ||
			type === "module" ||
			(upper !== null && upper.type === "module");
		if (upper !== null) {
			if (upper.childScopes === NO_CHILD_SCOPES) upper.childScopes = [this];
			else upper.childScopes.push(this);
		}
	}

	/**
	 * @param {string} name name to look up
	 * @returns {Variable | undefined} the binding this scope declares under that name
	 */
	getBinding(name) {
		const index = this._index;
		if (index !== undefined) return index.get(name);
		const variables = this.variables;
		for (let i = 0; i < variables.length; i++) {
			const variable = variables[i];
			if (variable.name === name) return variable;
		}
		return undefined;
	}
}

/** A binding: one name declared in one scope. */
class Variable {
	/**
	 * @param {string} name the declared name
	 * @param {Scope} scope the declaring scope
	 */
	constructor(name, scope) {
		/** @type {string} */
		this.name = name;
		/** @type {Identifier[]} declaring occurrences */
		this.identifiers = NO_IDENTIFIERS;
		/** @type {Reference[]} occurrences that resolved here, at any depth */
		this.references = NO_REFERENCES;
		/** @type {Scope} */
		this.scope = scope;
	}
}

/** One identifier occurrence that refers to a binding. */
class Reference {
	/**
	 * @param {Identifier} identifier the identifier node
	 * @param {Scope} from the scope the identifier was seen in
	 */
	constructor(identifier, from) {
		/** @type {Identifier} */
		this.identifier = identifier;
		/** @type {Scope} */
		this.from = from;
		/** @type {Variable | undefined} set during resolution, absent when free */
		this.resolved = undefined;
	}
}

/**
 * Returned by `_pattern` for a plain identifier. Never mutated by callers.
 * @type {Node[]}
 */
const NO_RIGHT_HAND_NODES = [];

/**
 * Stand-ins for the collections of a scope that declares nothing and encloses
 * nothing — over half of them are one or both. Each is replaced by a real
 * collection when the scope first needs it. None of them is ever mutated.
 * @type {Variable[]}
 */
const NO_VARIABLE_LIST = [];
/** @type {Scope[]} */
const NO_CHILD_SCOPES = [];
/** @type {Reference[]} */
const NO_REFERENCES = [];
/** @type {Identifier[]} */
const NO_IDENTIFIERS = [];

/**
 * Above this many bindings a scope indexes them in a `Map`; below it, scanning
 * the list is as fast and costs no second structure. ~96% of the scopes that
 * bind anything stay below.
 */
const INDEX_THRESHOLD = 8;

/**
 * What `_pattern` does with each name it binds. An integer rather than a
 * callback, so walking a pattern allocates no closure.
 */
const PATTERN_DEFINE = 0;
const PATTERN_DEFINE_INIT = 1;
const PATTERN_REFERENCE = 2;
const PATTERN_REFERENCE_PLAIN = 3;

/**
 * Adds a binding to a scope, seeding its list on the first one and building an
 * index once the scope has outgrown a scan.
 * @param {Scope} scope the scope that just declared a name
 * @param {Variable} variable the binding it declared
 * @returns {void}
 */
const addBinding = (scope, variable) => {
	const variables = scope.variables;
	if (variables === NO_VARIABLE_LIST) {
		scope.variables = [variable];
		return;
	}
	variables.push(variable);
	const index = scope._index;
	if (index !== undefined) {
		index.set(variable.name, variable);
		return;
	}
	if (variables.length <= INDEX_THRESHOLD) return;
	/** @type {Map<string, Variable>} */
	const built = new Map();
	for (let i = 0; i < variables.length; i++) {
		built.set(variables[i].name, variables[i]);
	}
	scope._index = built;
};

/**
 * Statement types that provably declare nothing in the block that holds them —
 * `var` hoists past it, and the rest bind nowhere. Anything else, a syntax
 * this list has not heard of included, is assumed to declare.
 * @type {Set<string>}
 */
const STATEMENTS_WITHOUT_BINDINGS = new Set([
	"BlockStatement",
	"BreakStatement",
	"ContinueStatement",
	"DebuggerStatement",
	"DoWhileStatement",
	"EmptyStatement",
	"ExpressionStatement",
	"ForInStatement",
	"ForOfStatement",
	"ForStatement",
	"IfStatement",
	"ReturnStatement",
	"SwitchStatement",
	"ThrowStatement",
	"TryStatement",
	"WhileStatement",
	"WithStatement"
]);

/**
 * Whether a statement list needs a scope of its own to hold what it declares.
 * @param {(Node | null | undefined)[]} body statement list
 * @returns {boolean} true when a scope has to be opened for it
 */
const needsScope = (body) => {
	for (let i = 0; i < body.length; i++) {
		const statement = body[i];
		if (statement === null || statement === undefined) continue;
		const type = statement.type;
		if (type === "VariableDeclaration") {
			if (statement.kind !== "var") return true;
		} else if (type === "SwitchCase") {
			if (needsScope(statement.consequent)) return true;
		} else if (!STATEMENTS_WITHOUT_BINDINGS.has(type)) {
			return true;
		}
	}
	return false;
};

/**
 * Node types that may appear as an assignment or binding target.
 * @param {Node} node node to test
 * @returns {boolean} true when the node can hold bindings
 */
const isPattern = (node) => {
	const type = node.type;
	return (
		type === "Identifier" ||
		type === "ObjectPattern" ||
		type === "ArrayPattern" ||
		type === "SpreadElement" ||
		type === "RestElement" ||
		type === "AssignmentPattern"
	);
};

/**
 * Whether a binding found in a function scope is invisible to a reference,
 * because the reference sits in the parameter list and the binding is declared
 * in the body.
 *
 * Parameters and body share one scope here, but the language gives them two:
 * a function with parameters evaluates them first, and only then creates the
 * environment its body declarations live in. So a parameter default reads the
 * enclosing scope, never the body.
 *
 * A name declared in *both* places is not hidden — that is what keeps the `x`
 * in `function f(x) { var x = 1; return x }` resolving to the parameter.
 * @param {Variable} variable a binding found in a function scope with parameters
 * @param {Identifier} identifier the identifier being resolved
 * @param {number} boundary source offset where that function's body starts
 * @returns {boolean} true when resolution must skip this binding and climb
 * @example
 * ```js
 * const x = 1;
 * function f(a = x) { const x = 2; }
 * // the default reads the outer `x`; the body's `x` does not exist yet
 * ```
 */
const isHiddenBodyBinding = (variable, identifier, boundary) => {
	// a reference in the body sees everything the scope holds
	if (/** @type {Identifier & Offset} */ (identifier).start >= boundary) {
		return false;
	}
	const identifiers = variable.identifiers;
	for (let i = 0; i < identifiers.length; i++) {
		// declared in the parameter list too, so the parameters do see it
		if (/** @type {Identifier & Offset} */ (identifiers[i]).start < boundary) {
			return false;
		}
	}
	return true;
};

class ScopeAnalyzer {
	/**
	 * @param {boolean} recordEveryReference whether every binding collects its references
	 */
	constructor(recordEveryReference) {
		/** @type {Scope} the scope the walker is currently inside */
		this.scope = /** @type {Scope} */ (/** @type {unknown} */ (null));
		/** @type {Identifier[]} identifiers awaiting resolution */
		this.pendingIdentifiers = [];
		/** @type {Scope[]} the scope each pending identifier was seen in */
		this.pendingScopes = [];
		/** @type {boolean} */
		this.recordEveryReference = recordEveryReference;
	}

	/**
	 * @param {ScopeType} type scope kind
	 * @param {Node} block node opening the scope
	 * @param {boolean} isVarScope whether `var` hoists to here
	 * @returns {Scope} the new scope, now current
	 */
	_push(type, block, isVarScope) {
		const scope = new Scope(
			type,
			block,
			this.scope,
			isVarScope,
			this.recordEveryReference
		);
		this.scope = scope;
		return scope;
	}

	/**
	 * @returns {void}
	 */
	_pop() {
		this.scope = /** @type {Scope} */ (this.scope.upper);
	}

	/**
	 * Declares a name in a scope, reusing the binding when it already exists
	 * (`var x; var x;`, a function and its hoisted declaration, and so on).
	 * @param {Scope} scope scope to declare in
	 * @param {Node | null} node the declaring identifier, absent for an anonymous `export default` declaration
	 * @returns {void}
	 */
	_define(scope, node) {
		if (node === null || node.type !== "Identifier") return;
		const name = node.name;
		let variable = scope.getBinding(name);
		if (variable === undefined) {
			variable = new Variable(name, scope);
			addBinding(scope, variable);
		}
		if (variable.identifiers === NO_IDENTIFIERS) {
			variable.identifiers = [/** @type {Identifier} */ (node)];
		} else {
			variable.identifiers.push(/** @type {Identifier} */ (node));
		}
	}

	/**
	 * Records an identifier occurrence to be resolved once the walk is done.
	 * @param {Node} node the identifier
	 * @returns {void}
	 */
	_reference(node) {
		this.pendingIdentifiers.push(/** @type {Identifier} */ (node));
		this.pendingScopes.push(this.scope);
	}

	/**
	 * Binds or references one name of a pattern, as `mode` asks.
	 * @param {Node} node the bound identifier
	 * @param {number} defaults number of enclosing defaults
	 * @param {number} mode one of the `PATTERN_*` constants
	 * @param {Scope} target scope to declare in
	 * @returns {void}
	 */
	_bind(node, defaults, mode, target) {
		if (mode <= PATTERN_DEFINE_INIT) this._define(target, node);
		if (mode !== PATTERN_REFERENCE_PLAIN) {
			for (let d = 0; d < defaults; d++) this._reference(node);
		}
		if (mode >= PATTERN_DEFINE_INIT) this._reference(node);
	}

	/**
	 * Walks a binding pattern, binding each name it holds. The expressions
	 * inside it are returned rather than visited, so every name binds first.
	 * @param {Node} root the pattern
	 * @param {number} mode one of the `PATTERN_*` constants
	 * @param {Scope} target scope to declare in
	 * @returns {Node[]} expressions still to visit
	 */
	_pattern(root, mode, target) {
		// a bare identifier is ~97% of calls and holds no expressions, so it
		// needs neither the result array nor a walk
		if (root.type === "Identifier") {
			this._bind(root, 0, mode, target);
			return NO_RIGHT_HAND_NODES;
		}
		/** @type {Node[]} */
		const rightHandNodes = [];
		this._patternWalk(root, mode, target, 0, rightHandNodes);
		return rightHandNodes;
	}

	/**
	 * @param {Node | null} node current pattern node
	 * @param {number} mode one of the `PATTERN_*` constants
	 * @param {Scope} target scope to declare in
	 * @param {number} defaults number of enclosing defaults
	 * @param {Node[]} rightHandNodes collects the expressions still to visit
	 * @returns {void}
	 */
	_patternWalk(node, mode, target, defaults, rightHandNodes) {
		if (node === null || node === undefined) return;
		switch (node.type) {
			case "Identifier":
				this._bind(node, defaults, mode, target);
				return;
			case "ObjectPattern":
				for (const property of node.properties) {
					this._patternWalk(property, mode, target, defaults, rightHandNodes);
				}
				return;
			case "ArrayPattern":
				for (const element of node.elements) {
					this._patternWalk(element, mode, target, defaults, rightHandNodes);
				}
				return;
			case "Property":
				if (node.computed) rightHandNodes.push(node.key);
				this._patternWalk(node.value, mode, target, defaults, rightHandNodes);
				return;
			case "AssignmentPattern":
				this._patternWalk(
					node.left,
					mode,
					target,
					defaults + 1,
					rightHandNodes
				);
				rightHandNodes.push(node.right);
				return;
			case "RestElement":
			case "SpreadElement":
				this._patternWalk(
					node.argument,
					mode,
					target,
					defaults,
					rightHandNodes
				);
				return;
			case "MemberExpression":
				// the object is only read; the write lands on its property
				if (node.computed) rightHandNodes.push(node.property);
				rightHandNodes.push(node.object);
				return;
			// assignment targets the parser reports as expressions
			case "ArrayExpression":
				for (const element of node.elements) {
					this._patternWalk(element, mode, target, defaults, rightHandNodes);
				}
				return;
			case "ObjectExpression":
				for (const property of node.properties) {
					this._patternWalk(property, mode, target, defaults, rightHandNodes);
				}
				return;
			case "AssignmentExpression":
				this._patternWalk(
					node.left,
					mode,
					target,
					defaults + 1,
					rightHandNodes
				);
				rightHandNodes.push(node.right);
				return;
			default:
				rightHandNodes.push(node);
		}
	}

	/**
	 * @param {(Node | null | undefined)[]} nodes statement or expression list, holes and all
	 * @returns {void}
	 */
	_visitAll(nodes) {
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			if (node !== null && node !== undefined) this._visit(node);
		}
	}

	/**
	 * A function's parameters and body share one scope, so a named function
	 * expression gets an extra scope above it holding only its own name.
	 * @param {ESTreeFunction} node Function node
	 * @returns {void}
	 */
	_visitFunction(node) {
		if (node.type === "FunctionDeclaration") {
			// block scoped in ES6, so it lands in the enclosing scope
			this._define(this.scope, /** @type {Node} */ (node.id));
		}

		const named =
			node.type === "FunctionExpression" &&
			node.id !== null &&
			node.id !== undefined;
		if (named) {
			this._push("function-expression-name", node, false);
			this._define(this.scope, /** @type {Node} */ (node.id));
		}

		const scope = this._push("function", node, true);

		if (node.type !== "ArrowFunctionExpression") {
			// every non-arrow function has an implicit `arguments`
			addBinding(scope, new Variable("arguments", scope));
		}

		const params = node.params;
		if (params.length !== 0) {
			scope.paramBoundary = /** @type {Node & Offset} */ (node.body).start;
			for (let i = 0; i < params.length; i++) {
				const rightHandNodes = this._pattern(params[i], PATTERN_DEFINE, scope);
				this._visitAll(rightHandNodes);
			}
		}

		const body = node.body;
		if (body.type === "BlockStatement") {
			// the body block is the function scope; it gets no scope of its own
			this._visitAll(body.body);
		} else {
			this._visit(body);
		}

		this._pop();
		if (named) this._pop();
	}

	/**
	 * The class name is bound twice: outside, so siblings can see the class,
	 * and inside, so the body and the heritage clause see a binding that an
	 * outer reassignment cannot change.
	 * @param {import("estree").ClassDeclaration | import("estree").ClassExpression} node Class node
	 * @returns {void}
	 */
	_visitClass(node) {
		if (node.type === "ClassDeclaration") {
			this._define(this.scope, /** @type {Node} */ (node.id));
		}
		const scope = this._push("class", node, false);
		if (node.id !== null && node.id !== undefined) {
			this._define(scope, node.id);
		}
		// the heritage clause is evaluated inside the class scope
		if (node.superClass !== null && node.superClass !== undefined) {
			this._visit(node.superClass);
		}
		this._visit(node.body);
		this._pop();
	}

	/**
	 * @param {import("estree").ForInStatement | import("estree").ForOfStatement} node the loop
	 * @returns {void}
	 */
	_visitForIn(node) {
		const left = node.left;
		const lexical = left.type === "VariableDeclaration" && left.kind !== "var";
		if (lexical) this._push("for", node, false);

		if (left.type === "VariableDeclaration") {
			this._visit(left);
			// the loop head writes each iteration; right-hand nodes were
			// already visited by the declaration above
			this._pattern(
				left.declarations[0].id,
				PATTERN_REFERENCE_PLAIN,
				this.scope
			);
		} else {
			const rightHandNodes = this._pattern(left, PATTERN_REFERENCE, this.scope);
			this._visitAll(rightHandNodes);
		}

		this._visit(node.right);
		this._visit(node.body);
		if (lexical) this._pop();
	}

	/**
	 * Fallback for node types the key table does not know, so unfamiliar
	 * syntax still contributes its references instead of silently vanishing.
	 * @param {Node} node node of an unknown type
	 * @returns {void}
	 */
	_visitUnknown(node) {
		for (const key in node) {
			if (
				key === "type" ||
				key === "start" ||
				key === "end" ||
				key === "range" ||
				key === "loc" ||
				key === "parent" ||
				key === "leadingComments" ||
				key === "trailingComments"
			) {
				continue;
			}
			if (key === "key" && "computed" in node && node.computed === false) {
				continue;
			}
			const child = /** @type {Record<string, unknown>} */ (
				/** @type {unknown} */ (node)
			)[key];
			if (child === null || typeof child !== "object") continue;
			if (Array.isArray(child)) {
				for (const item of child) {
					if (item !== null && typeof item === "object" && item.type) {
						this._visit(item);
					}
				}
			} else if (/** @type {Node} */ (child).type) {
				this._visit(/** @type {Node} */ (child));
			}
		}
	}

	/**
	 * @param {Node} node node to visit
	 * @returns {void}
	 */
	_visit(node) {
		// cases are ordered by measured frequency: the chain is a sequence of
		// comparisons, so a type that falls through to `default` pays all of them
		switch (node.type) {
			case "Identifier":
				this._reference(node);
				return;

			// leaves too common to leave at the end of the chain: together they
			// are ~14% of all visits, and every case above them is a comparison
			case "Literal":
			case "ThisExpression":
				return;

			case "MemberExpression":
				this._visit(node.object);
				// `a.b` reads `a`; `b` is a property name, not a binding
				if (node.computed) this._visit(node.property);
				return;

			// the types the key table below would otherwise handle, and which
			// together are ~31% of all visits — a call alone is 10%
			case "CallExpression":
			case "NewExpression":
				this._visit(node.callee);
				this._visitAll(node.arguments);
				return;

			case "ExpressionStatement":
				this._visit(node.expression);
				return;

			case "BinaryExpression":
			case "LogicalExpression":
				this._visit(node.left);
				this._visit(node.right);
				return;

			case "ReturnStatement":
			case "ThrowStatement":
			case "UnaryExpression":
			case "AwaitExpression":
			case "SpreadElement":
			case "YieldExpression":
				if (node.argument !== null && node.argument !== undefined) {
					this._visit(node.argument);
				}
				return;

			case "IfStatement":
			case "ConditionalExpression":
				this._visit(node.test);
				this._visit(node.consequent);
				if (node.alternate !== null && node.alternate !== undefined) {
					this._visit(node.alternate);
				}
				return;

			case "SwitchCase":
				if (node.test !== null && node.test !== undefined) {
					this._visit(node.test);
				}
				this._visitAll(node.consequent);
				return;

			case "ArrayExpression":
				this._visitAll(node.elements);
				return;

			case "ObjectExpression":
				this._visitAll(node.properties);
				return;

			case "Property":
			case "MethodDefinition":
				if (node.computed) this._visit(node.key);
				this._visit(node.value);
				return;

			case "PropertyDefinition":
				if (node.computed) this._visit(node.key);
				if (node.value !== null && node.value !== undefined) {
					// each field initializer runs in its own scope
					this._push("class-field-initializer", node.value, true);
					this._visit(node.value);
					this._pop();
				}
				return;

			case "StaticBlock":
				this._push("class-static-block", node, true);
				this._visitAll(node.body);
				this._pop();
				return;

			case "BlockStatement": {
				const scoped = needsScope(node.body);
				if (scoped) this._push("block", node, false);
				this._visitAll(node.body);
				if (scoped) this._pop();
				return;
			}

			case "SwitchStatement": {
				this._visit(node.discriminant);
				const scoped = needsScope(node.cases);
				if (scoped) this._push("switch", node, false);
				this._visitAll(node.cases);
				if (scoped) this._pop();
				return;
			}

			case "ForStatement": {
				const init = node.init;
				const lexical =
					init !== null &&
					init !== undefined &&
					init.type === "VariableDeclaration" &&
					init.kind !== "var";
				if (lexical) this._push("for", node, false);
				if (init !== null && init !== undefined) this._visit(init);
				if (node.test !== null && node.test !== undefined) {
					this._visit(node.test);
				}
				if (node.update !== null && node.update !== undefined) {
					this._visit(node.update);
				}
				this._visit(node.body);
				if (lexical) this._pop();
				return;
			}

			case "ForInStatement":
			case "ForOfStatement":
				this._visitForIn(node);
				return;

			case "VariableDeclaration": {
				// `var` hoists to the nearest function-like scope, everything
				// else binds right here
				const target =
					node.kind === "var" ? this.scope.variableScope : this.scope;
				for (const declarator of node.declarations) {
					const init = declarator.init;
					const initialized = init !== null && init !== undefined;
					const rightHandNodes = this._pattern(
						declarator.id,
						initialized ? PATTERN_DEFINE_INIT : PATTERN_DEFINE,
						target
					);
					this._visitAll(rightHandNodes);
					if (initialized) this._visit(init);
				}
				return;
			}

			case "AssignmentExpression":
				if (isPattern(node.left)) {
					if (node.operator === "=") {
						const rightHandNodes = this._pattern(
							node.left,
							PATTERN_REFERENCE,
							this.scope
						);
						this._visitAll(rightHandNodes);
					} else if (node.left.type === "Identifier") {
						// `x += 1` reads and writes the same binding
						this._reference(node.left);
					} else {
						this._visit(node.left);
					}
				} else {
					this._visit(node.left);
				}
				this._visit(node.right);
				return;

			case "UpdateExpression":
				if (node.argument.type === "Identifier") {
					this._reference(node.argument);
				} else {
					this._visit(node.argument);
				}
				return;

			case "FunctionDeclaration":
			case "FunctionExpression":
			case "ArrowFunctionExpression":
				this._visitFunction(node);
				return;

			case "ClassDeclaration":
			case "ClassExpression":
				this._visitClass(node);
				return;

			case "CatchClause":
				this._push("catch", node, false);
				if (node.param !== null && node.param !== undefined) {
					const rightHandNodes = this._pattern(
						node.param,
						PATTERN_DEFINE,
						this.scope
					);
					this._visitAll(rightHandNodes);
				}
				this._visit(node.body);
				this._pop();
				return;

			case "WithStatement":
				this._visit(node.object);
				this._push("with", node, false);
				this._visit(node.body);
				this._pop();
				return;

			case "ImportDeclaration":
				// every specifier introduces a local binding; the source is a
				// literal and attributes hold no references
				for (const specifier of node.specifiers) {
					const local = specifier.local;
					if (local !== null && local !== undefined) {
						this._define(this.scope, local);
					}
				}
				return;

			case "ExportAllDeclaration":
				// always re-exports from a source, so nothing local is referenced
				return;

			case "ExportDefaultDeclaration":
				this._visit(/** @type {Node} */ (node.declaration));
				return;

			case "ExportNamedDeclaration":
				if (node.source !== null && node.source !== undefined) return;
				if (node.declaration !== null && node.declaration !== undefined) {
					this._visit(node.declaration);
					return;
				}
				this._visitAll(node.specifiers);
				return;

			case "ExportSpecifier":
				// `export { x }` reads `x`; the exported name is not a binding
				if (node.local.type === "Identifier") this._reference(node.local);
				return;

			case "LabeledStatement":
				// labels share the identifier node type but are not bindings
				this._visit(node.body);
				return;

			case "BreakStatement":
			case "ContinueStatement":
			case "MetaProperty":
			case "PrivateIdentifier":
			case "Super":
			case "EmptyStatement":
			case "DebuggerStatement":
				return;

			default: {
				const keys = CHILD_KEYS[node.type];
				if (keys === undefined) {
					this._visitUnknown(node);
					return;
				}
				for (let i = 0; i < keys.length; i++) {
					const child = /** @type {NodeChildren} */ (
						/** @type {unknown} */ (node)
					)[keys[i]];
					if (child === null || child === undefined) continue;
					if (Array.isArray(child)) {
						for (let j = 0; j < child.length; j++) {
							const item = child[j];
							if (item !== null && item !== undefined) this._visit(item);
						}
					} else {
						this._visit(child);
					}
				}
			}
		}
	}

	/**
	 * Resolves every recorded reference by climbing the scope chain from where
	 * it was seen. Runs once, after the whole tree has been walked, so a
	 * reference to a binding declared later still finds it.
	 * @returns {Reference[]} references that resolved to no binding
	 */
	_resolve() {
		const identifiers = this.pendingIdentifiers;
		const scopes = this.pendingScopes;
		/** @type {Reference[]} */
		const unresolved = [];

		for (let i = 0; i < identifiers.length; i++) {
			const identifier = identifiers[i];
			const name = identifier.name;
			const from = scopes[i];
			/** @type {Scope | null} */
			let scope = from;
			let resolved = false;

			while (scope !== null) {
				const variable = scope.getBinding(name);
				if (variable !== undefined) {
					// `-1` is every scope but a function scope with parameters, so
					// the common case is one integer compare and no call
					const boundary = scope.paramBoundary;
					if (
						boundary === -1 ||
						!isHiddenBodyBinding(variable, identifier, boundary)
					) {
						// most identifiers resolve into a scope nothing reads back,
						// so the `Reference` is built only where one is kept
						if (scope._recorded) {
							const reference = new Reference(identifier, from);
							reference.resolved = variable;
							if (variable.references === NO_REFERENCES) {
								variable.references = [reference];
							} else {
								variable.references.push(reference);
							}
						}
						resolved = true;
						break;
					}
				}
				scope = scope.upper;
			}

			if (!resolved) unresolved.push(new Reference(identifier, from));
		}

		return unresolved;
	}
}

/**
 * @typedef {object} ScopeAnalysis
 * @property {Scope} globalScope the outermost scope
 * @property {Scope} moduleScope the module body scope, where top-level declarations live
 * @property {Reference[]} unresolvedReferences every identifier that resolved to no binding — the module's free names
 */

/**
 * Analyses a generated module source as a strict ES module. Only the module
 * scope and its direct children collect references; `recordEveryReference`
 * widens that to the whole tree, retaining one per identifier.
 * @param {Program} ast the program to analyse
 * @param {boolean=} recordEveryReference whether every binding collects its references
 * @returns {ScopeAnalysis} the scope tree and the module's free references
 */
const analyzeScope = (ast, recordEveryReference = false) => {
	const analyzer = new ScopeAnalyzer(recordEveryReference);
	const globalScope = analyzer._push("global", ast, true);
	const moduleScope = analyzer._push("module", ast, true);
	analyzer._visitAll(ast.body);
	const unresolvedReferences = analyzer._resolve();
	return { globalScope, moduleScope, unresolvedReferences };
};

analyzeScope.Reference = Reference;
analyzeScope.Scope = Scope;
analyzeScope.Variable = Variable;

module.exports = analyzeScope;
