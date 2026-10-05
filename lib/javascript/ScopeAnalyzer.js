/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

// cspell:ignore defun, fnames, funarg

/**
 * @import {
 * 	Function as ESTreeFunction,
 * 	Identifier,
 * 	Node,
 * 	Program,
 * 	Property
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
	 * @param {Node} block the node that opened this scope, read but not kept
	 * @param {Scope | null} upper the enclosing scope
	 * @param {boolean} isVarScope whether `var` and function declarations hoist to here
	 * @param {boolean} recordEveryReference whether every binding collects its references, not only the ones webpack reads
	 */
	constructor(type, block, upper, isVarScope, recordEveryReference) {
		/** @type {ScopeType} */
		this.type = type;
		/** @type {string} the type of the node that opened this scope */
		this.blockType = block.type;
		/** @type {number} where that node starts */
		this.blockStart = /** @type {Node & Offset} */ (block).start;
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
		/** @type {Set<number>} where each shorthand property's identifier starts */
		this.shorthandIdentifierStarts = new Set();
		/** @type {boolean} */
		this.recordEveryReference = recordEveryReference;
	}

	/**
	 * Records where a shorthand property's identifier starts, so renaming it
	 * later needs the offset rather than the tree it was read from.
	 * @param {Property} property a property whose `shorthand` is set
	 * @returns {void}
	 */
	_recordShorthandIdentifier(property) {
		const value = property.value;
		const identifier = value.type === "AssignmentPattern" ? value.left : value;
		this.shorthandIdentifierStarts.add(
			/** @type {Identifier & Offset} */ (identifier).start
		);
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
				if (node.shorthand) this._recordShorthandIdentifier(node);
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
				if (node.shorthand) this._recordShorthandIdentifier(node);
				if (node.computed) this._visit(node.key);
				this._visit(node.value);
				return;

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
 * @property {Set<number>} shorthandIdentifierStarts where each shorthand property's identifier starts, so a rename can write `name: newName` without the tree
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
	return {
		globalScope,
		moduleScope,
		unresolvedReferences,
		shorthandIdentifierStarts: analyzer.shorthandIdentifierStarts
	};
};

/**
 * @typedef {import("./syntax-printer").PrintNode} PrintNode
 * @typedef {import("./syntax-printer").PrintProgram} PrintProgram
 * @typedef {import("./syntax-printer").PrintIdentifier} PrintIdentifier
 * @typedef {import("./syntax-printer").PrintLiteral} PrintLiteral
 * @typedef {import("./syntax-printer").PrintFunction} PrintFunction
 * @typedef {import("./syntax-printer").PrintClass} PrintClass
 * @typedef {import("./syntax-printer").PrintObject} PrintObject
 * @typedef {import("./syntax-printer").PrintArray} PrintArray
 * @typedef {import("./syntax-printer").PrintCallExpression} PrintCallExpression
 * @typedef {import("./syntax-printer").PrintNewExpression} PrintNewExpression
 * @typedef {import("./syntax-printer").PrintForStatement} PrintForStatement
 * @typedef {import("./syntax-printer").PrintForInStatement} PrintForInStatement
 * @typedef {import("./syntax-printer").PrintForOfStatement} PrintForOfStatement
 * @typedef {import("./syntax-printer").PrintWhileStatement} PrintWhileStatement
 * @typedef {import("./syntax-printer").PrintVariableDeclaration} PrintVariableDeclaration
 * @typedef {import("./syntax-printer").PrintVariableDeclarator} PrintVariableDeclarator
 * @typedef {import("./syntax-printer").PrintExport} PrintExport
 * @typedef {import("./syntax-printer").Token} Token
 * @typedef {import("./syntax-printer").Node} CompressorNode
 * @typedef {import("./syntax-printer").Scope} CompressorScopeShape
 * @typedef {import("./syntax-printer").Definition} CompressorDefinition
 */

// How a minifier definition's name was declared, one code per kind of
// terser's declaring symbol; a global is a name nothing declares.
const DECLARES_VAR = 1;
const DECLARES_FUNARG = 2;
const DECLARES_LET = 3;
const DECLARES_CONST = 4;
const DECLARES_USING = 5;
const DECLARES_CATCH = 6;
const DECLARES_IMPORT = 7;
const DECLARES_DEFUN = 8;
const DECLARES_LAMBDA = 9;
const DECLARES_CLASS = 10;
const DECLARES_DEF_CLASS = 11;
const DECLARES_GLOBAL = 12;

// The declarations a `var` or a parameter may not join, as `declarations` bits.
const LEXICAL_DECLARATIONS =
	(1 << DECLARES_LET) | (1 << DECLARES_CONST) | (1 << DECLARES_USING);

// What the minifier's analysis records of a name read, replayed once all is
// declared.
const REFERENCE_CALLED = 1;
const REFERENCE_EXPORTED = 1 << 1;
const REFERENCE_FROM_MODULE = 1 << 2;
const REFERENCE_CATCH = 1 << 3;

// How an `export` naming a definition keeps its name.
const EXPORT_KEEP_NAME = 1;
const EXPORT_WANT_MANGLE = 2;

// Past this many definitions a scope's `enclosed` is also held as a set, so
// adding one stops scanning the list: a bundle's toplevel reaches thousands.
const ENCLOSED_INDEX_THRESHOLD = 16;
/** @type {WeakMap<EXPECTED_ANY[], Set<EXPECTED_ANY>>} */
const enclosedIndexes = new WeakMap();

/**
 * Adds a definition to a scope's `enclosed` unless it is there. The list is
 * the record, since a cloned scope copies it; the set only answers membership.
 * @param {MinifierScope} scope a scope
 * @param {MinifierVariable} definition a definition it reaches
 * @returns {void}
 */
const encloseUnique = (scope, definition) => {
	const { enclosed } = scope;
	if (enclosed.length < ENCLOSED_INDEX_THRESHOLD) {
		if (!enclosed.includes(definition)) enclosed.push(definition);
		return;
	}
	let index = enclosedIndexes.get(enclosed);
	if (index === undefined || index.size !== enclosed.length) {
		index = new Set(enclosed);
		enclosedIndexes.set(enclosed, index);
	}
	if (index.has(definition)) return;
	index.add(definition);
	enclosed.push(definition);
};

/**
 * A scope as the minifier reads it: terser's, which opens one for every block
 * and loop, besides what it names in.
 */
class MinifierScope extends Scope {
	/**
	 * @param {ScopeType} type what opened this scope
	 * @param {PrintNode} node the node opening it
	 * @param {MinifierScope | null} upper the enclosing scope
	 * @param {boolean} isVarScope whether `var` and function declarations hoist to here
	 */
	constructor(type, node, upper, isVarScope) {
		super(type, /** @type {Node} */ (node), upper, isVarScope, false);
		/** @type {PrintNode} */
		this.node = node;
		/** @type {MinifierVariable[]} the definitions it or a scope inside it reads, in the order first read */
		this.enclosed = [];
		/** @type {number} how many names it has handed out, less one */
		this.cname = -1;
		/** @type {boolean} whether a direct `eval` can reach its names */
		this.usesEval = false;
		/** @type {boolean} whether a `with` can reach its names */
		this.usesWith = false;
		/** @type {MinifierVariable | null} a function expression's own name */
		this.functionName = null;
		/** @type {number} the first name its parameter list reads, as the analysis counts them, or -1 */
		this.parameterStart = -1;
		/** @type {number} the name after the last its parameter list reads, or -1 */
		this.parameterEnd = -1;
	}

	/**
	 * terser's `is_block_scope`.
	 * @returns {boolean} whether a block or a loop opens it
	 */
	isBlockScope() {
		return this.variableScope !== this;
	}

	/**
	 * terser's `get_defun_scope`.
	 * @returns {MinifierScope} the nearest scope around it, or it, that is not a block's
	 */
	getDefunScope() {
		return /** @type {MinifierScope} */ (this.variableScope);
	}

	/**
	 * terser's `pinned`.
	 * @returns {boolean} whether `eval` or `with` can reach its names
	 */
	isPinned() {
		return this.usesEval || this.usesWith;
	}

	/**
	 * terser's `find_variable`.
	 * @param {string} name a name
	 * @returns {MinifierVariable | undefined} what it resolves to from here
	 */
	findVariable(name) {
		return findMinifierVariable(this, name);
	}

	/**
	 * terser's `conflicting_def_shallow`.
	 * @param {string} name a name
	 * @returns {boolean} whether it is declared here or names a definition read here
	 */
	conflictingDefinitionShallow(name) {
		const { enclosed } = this;
		for (let i = 0; i < enclosed.length; i++) {
			if (enclosed[i].name === name) return true;
		}
		return this.getBinding(name) !== undefined;
	}

	/**
	 * terser's `conflicting_def`.
	 * @param {string} name a name
	 * @returns {boolean} whether it is taken here or further out
	 */
	conflictingDefinition(name) {
		for (
			let scope = /** @type {MinifierScope | null} */ (this);
			scope !== null;
			scope = /** @type {MinifierScope | null} */ (scope.upper)
		) {
			if (scope.conflictingDefinitionShallow(name)) return true;
		}
		return false;
	}

	/**
	 * terser's `mark_enclosed`: records that each scope from this one out to a
	 * definition's reads it.
	 * @param {MinifierVariable} variable the definition
	 * @returns {void}
	 */
	markEnclosed(variable) {
		encloseVariable(this, variable);
	}
}

/**
 * One name declared in one scope, or a global: terser's `SymbolDef`, less
 * what only the compressor reads.
 */
class MinifierVariable extends Variable {
	/**
	 * @param {string} name the declared name
	 * @param {MinifierScope} scope the declaring scope, the toplevel for a global
	 * @param {number} kind how it was first declared, as a `DECLARES_*` code
	 */
	constructor(name, scope, kind) {
		super(name, scope);
		/** @type {number} how it was first declared, as a `DECLARES_*` code */
		this.kind = kind;
		/** @type {number} every way it was declared, one bit per `DECLARES_*` code */
		this.declarations = 1 << kind;
		/** @type {boolean} whether the toplevel declares it */
		this.global = false;
		/** @type {boolean} whether nothing declares it */
		this.undeclared = false;
		/** @type {number} how an `export` naming it keeps its name, as `EXPORT_*` */
		this.export = 0;
		/** @type {string | null} the name mangling gives it */
		// eslint-disable-next-line camelcase -- terser's name, which the printer reads
		this.mangled_name = null;
	}
}

/** A label: a statement's, its `break`s and `continue`s naming it too. */
class MinifierLabel {
	/**
	 * @param {string} name the name
	 * @param {MinifierLabel | null} parent the label of the nearest labeled statement around, across functions
	 */
	constructor(name, parent) {
		/** @type {string} */
		this.name = name;
		/** @type {string | null} the name mangling gives it */
		// eslint-disable-next-line camelcase -- terser's name, which the printer reads
		this.mangled_name = null;
		/** @type {MinifierLabel | null} */
		this.parent = parent;
		/** @type {number} where the mangler's label names stood when it named this one */
		this.counter = -1;
	}
}

/**
 * A scope as the compressor reads it: the minifier's, and what terser's
 * compressor records of it besides. The node opening it holds it as its
 * `block_scope`, a function's or the program's as a block's does.
 */
class CompressorScope extends MinifierScope {
	/**
	 * @param {ScopeType} type what opened this scope
	 * @param {CompressorNode} node the node opening it
	 * @param {CompressorScopeShape | null} upper the enclosing scope
	 * @param {boolean} isVarScope whether `var` and function declarations hoist to here
	 */
	constructor(type, node, upper, isVarScope) {
		// Made with no parent, so the parent lists no child: the compressor never
		// reads `childScopes`, and its tree moves, copies and drops scopes.
		super(
			type,
			/** @type {PrintNode} */ (/** @type {unknown} */ (node)),
			null,
			true
		);
		this.upper = /** @type {Scope | null} */ (/** @type {unknown} */ (upper));
		if (!isVarScope) {
			this.variableScope = /** @type {Scope} */ (this.upper).variableScope;
		}
		/** @type {boolean} whether a function reads its own `arguments` */
		this.usesArguments = false;
	}

	/**
	 * The scope of a node made of this scope's node: as terser's node was a
	 * scope, it is a scope of its own, holding and reading the same definitions.
	 * @param {CompressorNode} node the node made of this scope's
	 * @returns {CompressorScopeShape} the scope
	 */
	share(node) {
		const shared = new CompressorScope(
			this.type,
			node,
			/** @type {CompressorScopeShape | null} */ (
				/** @type {unknown} */ (this.upper)
			),
			this.variableScope === this
		);
		shared.variables = this.variables;
		shared._index = this._index;
		shared.enclosed = this.enclosed;
		shared.usesEval = this.usesEval;
		shared.usesWith = this.usesWith;
		shared.usesArguments = this.usesArguments;
		return /** @type {CompressorScopeShape} */ (
			/** @type {unknown} */ (shared)
		);
	}

	/**
	 * Takes copies of what this scope shares with the scope it was made of, as
	 * terser's `clone` of a scope does.
	 * @returns {void}
	 */
	detach() {
		if (this.variables !== NO_VARIABLE_LIST) {
			this.variables = [...this.variables];
		}
		if (this._index !== undefined) this._index = new Map(this._index);
		this.enclosed = [...this.enclosed];
	}

	/**
	 * A copy of this scope for a copy of its node.
	 * @param {CompressorNode} node the copy of its node
	 * @returns {CompressorScopeShape} the copy
	 */
	copyFor(node) {
		const copy = this.share(node);
		copy.detach();
		return copy;
	}

	/**
	 * Adds a definition this scope declares under its name.
	 * @param {CompressorDefinition} variable the definition
	 * @returns {void}
	 */
	bind(variable) {
		addBinding(
			this,
			/** @type {Variable} */ (/** @type {unknown} */ (variable))
		);
	}

	/**
	 * terser's `def_variable`: declares a symbol's name here.
	 * @param {CompressorNode} symbol the declaring symbol
	 * @param {CompressorNode | null | undefined} init what it is initialized to
	 * @param {(node: CompressorNode) => boolean} isFunction whether a node is a function expression
	 * @returns {CompressorDefinition} its definition, made or joined
	 */
	defineVariable(symbol, init, isFunction) {
		const name = /** @type {string} */ (symbol.name);
		let variable = /** @type {CompressorDefinition | undefined} */ (
			/** @type {unknown} */ (this.getBinding(name))
		);
		if (variable !== undefined) {
			variable.identifiers.push(symbol);
			if (
				variable.init &&
				(variable.scope !== /** @type {unknown} */ (symbol.scope) ||
					isFunction(variable.init))
			) {
				variable.init = init;
			}
		} else {
			variable = createCompressorDefinition(
				name,
				/** @type {CompressorScopeShape} */ (/** @type {unknown} */ (this)),
				0,
				symbol,
				init
			);
			this.bind(variable);
			variable.global = this.upper === null;
		}
		return (symbol.definition = variable);
	}

	/**
	 * terser's `add_child_scope`: moves a function's or class's scope into this
	 * one, which with each scope around it reads what the moved one reads from
	 * them. Nothing lists a compressor scope's children, so nothing else moves.
	 * @param {CompressorScopeShape} child the scope moved in
	 * @param {(() => boolean) | null} readsArguments for an arrow, whether it reads the `arguments` of the function it moves into
	 * @returns {void}
	 */
	adopt(child, readsArguments) {
		const self = /** @type {CompressorScopeShape} */ (
			/** @type {unknown} */ (this)
		);
		if (child.upper === self) return;
		child.upper = self;
		if (
			readsArguments !== null &&
			this.type === "function" &&
			!this.usesArguments
		) {
			this.usesArguments = readsArguments();
		}
		this.usesWith = this.usesWith || child.usesWith;
		this.usesEval = this.usesEval || child.usesEval;
		/** @type {CompressorScopeShape[]} */
		const ancestry = [];
		for (
			let current = /** @type {CompressorScopeShape | null} */ (self);
			current !== null;
			current = current.upper
		) {
			ancestry.push(current);
		}
		ancestry.reverse();
		const enclosedByChild = new Set(child.enclosed);
		/** @type {CompressorDefinition[]} */
		const toEnclose = [];
		for (const ancestor of ancestry) {
			const scope = /** @type {MinifierScope} */ (
				/** @type {unknown} */ (ancestor)
			);
			for (const definition of toEnclose) {
				encloseUnique(
					scope,
					/** @type {MinifierVariable} */ (/** @type {unknown} */ (definition))
				);
			}
			const { variables } = ancestor;
			// Where the moved scope encloses fewer names than this one declares,
			// they are looked up here, and the variables read in order only to
			// order two or more of them.
			let left = variables.length;
			/** @type {CompressorDefinition | undefined} */
			let declared;
			if (left > enclosedByChild.size) {
				left = 0;
				for (const definition of enclosedByChild) {
					if (ancestor.getBinding(definition.name) !== definition) continue;
					declared = definition;
					left++;
				}
				if (left === 0) continue;
				if (left === 1) {
					const only = /** @type {CompressorDefinition} */ (declared);
					if (!toEnclose.includes(only)) toEnclose.push(only);
					encloseUnique(
						scope,
						/** @type {MinifierVariable} */ (/** @type {unknown} */ (only))
					);
					continue;
				}
			}
			for (let i = 0; i < variables.length; i++) {
				const definition = variables[i];
				if (enclosedByChild.has(definition)) {
					if (!toEnclose.includes(definition)) toEnclose.push(definition);
					encloseUnique(
						scope,
						/** @type {MinifierVariable} */ (
							/** @type {unknown} */ (definition)
						)
					);
					if (--left === 0) break;
				}
			}
		}
	}

	/**
	 * terser's `add_reference`: a symbol in this scope reads its definition.
	 * @param {CompressorNode} symbol the symbol
	 * @returns {void}
	 */
	addReference(symbol) {
		const variable = symbol.definition;
		variable.references.push(symbol);
		encloseVariable(
			this,
			/** @type {MinifierVariable} */ (/** @type {unknown} */ (variable))
		);
	}
}

let nextCompressorVariableId = 1;

/**
 * One name declared in one scope, or a global: terser's `SymbolDef`, its
 * `orig` the base's `identifiers`, with what the compressor records of it.
 */
class CompressorVariable extends MinifierVariable {
	/**
	 * @param {string} name the declared name
	 * @param {CompressorScopeShape | null} scope the declaring scope, the toplevel for a global
	 * @param {number} kind how it was first declared, as a `DECLARES_*` code, 0 where the compressor declares it
	 * @param {CompressorNode | { name: string }} orig its first declaring symbol
	 * @param {CompressorNode | null | undefined} init what it is initialized to
	 */
	constructor(name, scope, kind, orig, init) {
		super(
			name,
			/** @type {MinifierScope} */ (/** @type {unknown} */ (scope)),
			kind
		);
		this.identifiers = [
			/** @type {Identifier} */ (/** @type {unknown} */ (orig))
		];
		/** @type {CompressorNode | null | undefined} what it is initialized to */
		this.init = init;
		/** @type {number} a number no other definition has, in the order made */
		this.id = nextCompressorVariableId++;
		/* eslint-disable camelcase -- terser's names, which the compressor reads */
		/** @type {number} how many of its declarations were dropped */
		this.eliminated = 0;
		/** @type {number} how many times it is assigned */
		this.assignments = 0;
		/** @type {number} how many of its reads were replaced by its value */
		this.replaced = 0;
		/** @type {boolean} whether it is assigned in a chain */
		this.chained = false;
		/** @type {boolean} whether its value is read where it may be changed */
		this.direct_access = false;
		/** @type {number} how many properties are read off it before its value escapes, 0 where it does not */
		this.escaped = 0;
		/** @type {number} how many of its reads are its own function's calls of itself */
		this.recursive_refs = 0;
		/** @type {boolean | string | undefined} whether it is read once, "m" where that read may change it */
		this.single_use = false;
		/** @type {EXPECTED_ANY} its value, as `reduce_vars` worked it out, false where unknown */
		this.fixed = false;
		/* eslint-enable camelcase */
		/** @type {Reference[]} the symbols reading it, which `SymbolDefinition` types as nodes */
		this.references = [];
	}
}

/**
 * A definition the compressor reads, typed as it reads the shared model.
 * @param {string} name the declared name
 * @param {CompressorScopeShape | null} scope the declaring scope, the toplevel for a global
 * @param {number} kind how it was first declared, as a `DECLARES_*` code, 0 where the compressor declares it
 * @param {CompressorNode | { name: string }} orig its first declaring symbol
 * @param {CompressorNode | null | undefined} init what it is initialized to
 * @returns {CompressorDefinition} the definition
 */
const createCompressorDefinition = (name, scope, kind, orig, init) =>
	/** @type {CompressorDefinition} */ (
		/** @type {unknown} */ (
			new CompressorVariable(name, scope, kind, orig, init)
		)
	);

/**
 * A scope the compressor reads, typed as it reads the shared model.
 * @param {ScopeType} type what opened this scope
 * @param {CompressorNode} node the node opening it
 * @param {CompressorScopeShape | null} upper the enclosing scope
 * @param {boolean} isVarScope whether `var` and function declarations hoist to here
 * @returns {CompressorScopeShape} the scope
 */
const createCompressorScope = (type, node, upper, isVarScope) =>
	/** @type {CompressorScopeShape} */ (
		/** @type {unknown} */ (new CompressorScope(type, node, upper, isVarScope))
	);

/**
 * The options the minifier's analysis reads, its mangle options among them.
 * @typedef {object} MinifierScopeOptions
 * @property {boolean=} module whether the program is a module, so strict
 * @property {boolean=} ie8 whether catch parameters belong to their function
 * @property {boolean=} safari10 whether a loop's scope reads its parent's names, and catch parameters belong to their function
 * @property {EXPECTED_ANY=} keep_fnames which function names survive, collecting the declarators naming one
 * @property {boolean=} parameterScopes whether a name read in a parameter list or a catch parameter skips what the body declares, as the spec scopes it
 */

/**
 * @typedef {object} MinifierScopeAnalysis
 * @property {MinifierScope} toplevel the program's scope, its `childScopes` in the order the mangler walks them
 * @property {MinifierLabel[]} labels every label, in the same order
 * @property {Map<string, MinifierVariable>} globals the names nothing declares, in the order first read
 * @property {Set<MinifierScope>} blockDefunScopes the function scopes holding a function declared in a block
 * @property {PrintIdentifier[] | null} functionDeclarators under `keep_fnames`, the names declarators give anonymous functions, in the order the mangler asks `keep_fnames` of them
 * @property {PrintIdentifier[]} catchParameters unless `ie8` or `safari10` move them, the catch parameters, in the order the mangler walks them
 * @property {number[]} catchParameterScopeCounts how many scopes the walk had opened at each catch parameter
 */

/**
 * @param {PrintNode} node a node
 * @returns {boolean} whether terser holds it as a scope its statements sit in directly
 */
const isStatementScope = (node) =>
	node.type === "Program" ||
	node.type === "FunctionDeclaration" ||
	node.type === "FunctionExpression" ||
	node.type === "ArrowFunctionExpression" ||
	node.type === "StaticBlock";

/**
 * @param {PrintNode} node a node
 * @returns {node is PrintExport} whether it is an `export`
 */
const isExport = (node) =>
	node.type === "ExportNamedDeclaration" ||
	node.type === "ExportDefaultDeclaration" ||
	node.type === "ExportAllDeclaration";

/**
 * @param {MinifierScope} scope the scope declaring it
 * @param {MinifierVariable} variable a definition
 * @param {number} read the read's place in the analysis's count
 * @returns {boolean} whether the read sits in the scope's parameter list and the definition in its body, which the list cannot see
 */
const isHiddenFromParameters = (scope, variable, read) =>
	read < scope.parameterEnd &&
	read >= scope.parameterStart &&
	variable.kind !== DECLARES_FUNARG &&
	variable.kind !== DECLARES_LAMBDA &&
	variable.kind !== DECLARES_CATCH;

/**
 * @param {MinifierScope} from the scope a name is read in
 * @param {string} name the name
 * @param {number=} read the read's place in the analysis's count, under `parameterScopes`
 * @returns {MinifierVariable | undefined} what it resolves to from there
 */
const findMinifierVariable = (from, name, read = -1) => {
	for (let scope = /** @type {Scope | null} */ (from); scope !== null;) {
		// `getBinding`, inlined: the interpreter pays a call per scope climbed
		const index = scope._index;
		/** @type {MinifierVariable | undefined} */
		let variable;
		if (index !== undefined) {
			variable = /** @type {MinifierVariable | undefined} */ (index.get(name));
		} else {
			const variables = scope.variables;
			for (let i = 0; i < variables.length; i++) {
				if (variables[i].name === name) {
					variable = /** @type {MinifierVariable} */ (variables[i]);
					break;
				}
			}
		}
		if (
			variable !== undefined &&
			!isHiddenFromParameters(
				/** @type {MinifierScope} */ (scope),
				variable,
				read
			)
		) {
			return variable;
		}
		scope = scope.upper;
	}
	return undefined;
};

/**
 * terser's `mark_enclosed`: each scope from one out to a definition's reads it.
 * @param {MinifierScope} from the scope reading it
 * @param {MinifierVariable} variable the definition
 * @returns {void}
 */
const encloseVariable = (from, variable) => {
	for (let scope = /** @type {Scope | null} */ (from); scope !== null;) {
		encloseUnique(/** @type {MinifierScope} */ (scope), variable);
		if (scope === variable.scope) break;
		scope = scope.upper;
	}
};

/**
 * Analyses the minifier's tree as terser's `figure_out_scope` does for its
 * mangler: the same scopes, definitions, enclosed lists and errors, in the
 * same orders, which the names it hands out depend on. Every name's
 * `definition` is set: its definition, its label, or null.
 */
class MinifierScopeAnalyzer extends ScopeAnalyzer {
	/**
	 * @param {PrintProgram} program the tree, its names as written
	 * @param {MinifierScopeOptions} options the mangle options
	 * @param {(node: PrintNode, message: string) => never} raise throws the parse error a misplaced declaration is
	 * @param {((node: PrintNode) => void) | undefined} release drops what only the compressor read off each node read, where nobody keeps the tree
	 */
	constructor(program, options, raise, release) {
		super(false);
		/** @type {(node: PrintNode, message: string) => never} */
		this.raise = raise;
		/** @type {((node: PrintNode) => void) | undefined} */
		this.release = release;
		/** @type {boolean} */
		this.legacyCatch = Boolean(options.ie8 || options.safari10);
		/** @type {boolean} */
		this.safari10 = Boolean(options.safari10);
		/** @type {boolean} */
		this.parameterScopes = Boolean(options.parameterScopes);
		// Only this analysis's reads are counted against a range, so each is
		// cleared once they resolve, before an analysis of a copy counts anew.
		/** @type {MinifierScope[]} the scopes holding a range of parameter reads */
		this.parameterRanges = [];
		/** @type {MinifierScope} */
		this.toplevel = new MinifierScope("global", program, null, true);
		this.scope = this.toplevel;
		/** @type {number} how many scopes are open or closed */
		this.scopeCount = 1;
		/** @type {MinifierLabel[]} */
		this.labels = [];
		/** @type {Map<string, MinifierVariable>} */
		this.globals = new Map();
		/** @type {Set<MinifierScope>} */
		this.blockDefunScopes = new Set();
		/** @type {PrintIdentifier[] | null} */
		this.functionDeclarators = options.keep_fnames ? [] : null;
		/** @type {MinifierScope[]} */
		this.forScopes = [];
		// The names read, and catch parameters, in the order terser's walk meets them.
		/** @type {(PrintIdentifier | PrintLiteral)[]} */
		this.referenceNodes = [];
		/** @type {MinifierScope[]} */
		this.referenceScopes = [];
		/** @type {number[]} */
		this.referenceFlags = [];
		// Under `ie8` or `safari10`, the catch parameters in `walk`'s order.
		/** @type {PrintIdentifier[]} */
		this.catchNames = [];
		/** @type {MinifierScope[]} */
		this.catchScopes = [];
		// Otherwise the catch parameters, which the mangler names in walk order too.
		/** @type {PrintIdentifier[]} */
		this.catchParameters = [];
		/** @type {number[]} */
		this.catchParameterScopeCounts = [];
		/** @type {PrintNode[]} the nodes terser's walk has pushed, the node visited last */
		this.stack = [];
		/** @type {boolean} */
		this.strict = Boolean(options.module);
		/** @type {Map<string, MinifierLabel>} the labels of the statements around, up to the nearest function */
		this.labelsInScope = new Map();
		/** @type {MinifierLabel | null} */
		this.currentLabel = null;
		/** @type {PrintNode | null} the pattern the walk is inside, which `_markExport` counts from */
		this.inDestructuring = null;
	}

	/**
	 * @param {ScopeType} type what opens it
	 * @param {PrintNode} node the node opening it
	 * @param {boolean} isVarScope whether `var` hoists to here
	 * @returns {MinifierScope} the scope, now current
	 */
	_open(type, node, isVarScope) {
		const scope = new MinifierScope(
			type,
			node,
			/** @type {MinifierScope} */ (this.scope),
			isVarScope
		);
		this.scopeCount++;
		this.scope = scope;
		return scope;
	}

	/**
	 * Opens a block's scope, which inherits whether a `with` reaches it.
	 * @param {ScopeType} type what opens it
	 * @param {PrintNode} node a block's node
	 * @returns {MinifierScope} the scope it leaves, now the new scope's parent
	 */
	_enterBlock(type, node) {
		const outer = /** @type {MinifierScope} */ (this.scope);
		this._open(type, node, false).usesWith = outer.usesWith;
		return outer;
	}

	/**
	 * terser's `def_variable`.
	 * @param {MinifierScope} target the scope declaring it
	 * @param {PrintIdentifier | null} identifier the name declaring it, if written
	 * @param {string} name the name
	 * @param {number} kind how it is declared
	 * @returns {MinifierVariable} its definition, made or joined
	 */
	_defineVariable(target, identifier, name, kind) {
		return this._addDeclaration(
			target,
			/** @type {MinifierVariable | undefined} */ (target.getBinding(name)),
			identifier,
			name,
			kind
		);
	}

	/**
	 * terser's `def_variable`, the scope's binding of the name already looked up.
	 * @param {MinifierScope} target the scope declaring it
	 * @param {MinifierVariable | undefined} variable what the scope binds the name to, if anything
	 * @param {PrintIdentifier | null} identifier the name declaring it, if written
	 * @param {string} name the name
	 * @param {number} kind how it is declared
	 * @returns {MinifierVariable} its definition, made or joined
	 */
	_addDeclaration(target, variable, identifier, name, kind) {
		if (variable !== undefined) {
			variable.declarations |= 1 << kind;
		} else {
			variable = new MinifierVariable(name, target, kind);
			variable.global = target.upper === null;
			if (this.legacyCatch && kind === DECLARES_CATCH) {
				variable.references = [];
			}
			addBinding(target, variable);
		}
		if (identifier !== null) {
			if (this.release !== undefined) this.release(identifier);
			identifier.definition = variable;
		}
		return variable;
	}

	/**
	 * terser's `reference`.
	 * @param {PrintIdentifier} identifier the name read
	 * @param {MinifierScope} from the scope reading it
	 * @param {MinifierVariable} variable what it reads
	 * @returns {void}
	 */
	_referenceVariable(identifier, from, variable) {
		if (variable.references !== NO_REFERENCES) {
			variable.references.push(
				new Reference(/** @type {Identifier} */ (identifier), from)
			);
		}
		encloseVariable(from, variable);
	}

	/**
	 * terser's `mark_export`, which counts its levels on terser's stack.
	 * @param {MinifierVariable} variable a definition just made
	 * @param {number} level where its declaration's statement is
	 * @returns {void}
	 */
	_markExport(variable, level) {
		const stack = this.stack;
		if (this.inDestructuring !== null) {
			let i = 0;
			do {
				level++;
			} while (stack[stack.length - 1 - i++] !== this.inDestructuring);
		}
		const node = stack[stack.length - 1 - level];
		if (node === undefined || !isExport(node)) {
			variable.export = 0;
			return;
		}
		// An ESTree tree read in makes a declaration a value terser keeps named.
		const declaration = /** @type {PrintNode} */ (
			node.exported_value || node.exported_definition
		);
		variable.export =
			node.type === "ExportDefaultDeclaration" &&
			Boolean(node.exported_definition) &&
			(declaration.type === "FunctionDeclaration" ||
				declaration.type === "ClassDeclaration")
				? EXPORT_WANT_MANGLE
				: EXPORT_KEEP_NAME;
	}

	/**
	 * @param {PrintNode} node an import or export
	 * @param {string} type terser's name for it
	 * @returns {void}
	 */
	_checkModuleStatement(node, type) {
		if (this.scope !== this.toplevel) {
			this.raise(node, `"${type}" statement may only appear at the top level`);
		}
	}

	/**
	 * @param {PrintIdentifier | PrintLiteral} node a name read, or a re-exported string
	 * @param {number} flags what else is known of it, as `REFERENCE_*` bits
	 * @returns {void}
	 */
	_addReference(node, flags) {
		if (this.release !== undefined) this.release(node);
		this.referenceNodes.push(node);
		this.referenceScopes.push(/** @type {MinifierScope} */ (this.scope));
		this.referenceFlags.push(flags);
	}

	/**
	 * A name a declaration or a pattern binds, or reads where `kind` is 0.
	 * @param {PrintNode} node the name or pattern
	 * @param {number} kind how it declares, as a `DECLARES_*` code, or 0
	 * @returns {void}
	 */
	_visitBinding(node, kind) {
		const stack = this.stack;
		switch (node.type) {
			case "Identifier":
				if (kind === 0) this._visitPrint(node);
				else this._declare(node, kind);
				return;
			case "ObjectPattern":
				this._visitPattern(node, node.properties, kind);
				return;
			case "ArrayPattern":
				this._visitPattern(node, node.elements, kind);
				return;
			case "AssignmentPattern":
				stack.push(node);
				this._visitBinding(node.left, kind);
				this._visitPrint(node.right);
				stack.pop();
				return;
			case "RestElement":
				stack.push(node);
				this._visitBinding(node.argument, kind);
				stack.pop();
				return;
			default:
				this._visitPrint(node);
		}
	}

	/**
	 * @param {PrintObject | PrintArray} pattern an object or array pattern
	 * @param {(PrintNode | null)[]} elements its properties or elements, holes null
	 * @param {number} kind how it declares, as a `DECLARES_*` code, or 0
	 * @returns {void}
	 */
	_visitPattern(pattern, elements, kind) {
		const stack = this.stack;
		const outer = this.inDestructuring;
		this.inDestructuring = pattern;
		stack.push(pattern);
		for (let i = 0; i < elements.length; i++) {
			const element = elements[i];
			if (!element) continue;
			if (element.type !== "Property") {
				this._visitBinding(element, kind);
				continue;
			}
			stack.push(element);
			if (element.computed) this._visitPrint(element.key);
			this._visitBinding(element.value, kind);
			stack.pop();
		}
		stack.pop();
		this.inDestructuring = outer;
	}

	/**
	 * A `var`, parameter, `let`, `const`, `using`, catch parameter or import.
	 * @param {PrintIdentifier} identifier the name declared
	 * @param {number} kind how, as a `DECLARES_*` code
	 * @returns {void}
	 */
	_declare(identifier, kind) {
		const { name } = identifier;
		const scope = /** @type {MinifierScope} */ (this.scope);
		if (kind === DECLARES_IMPORT) {
			this._defineVariable(scope, identifier, name, kind);
			return;
		}
		const blockDeclaration =
			kind === DECLARES_LET ||
			kind === DECLARES_CONST ||
			kind === DECLARES_USING ||
			kind === DECLARES_CATCH;
		const defun = /** @type {MinifierScope} */ (scope.variableScope);
		const target = blockDeclaration ? scope : defun;
		const before = /** @type {MinifierVariable | undefined} */ (
			target.getBinding(name)
		);
		const earlier = before === undefined ? 0 : before.declarations;
		const variable = this._addDeclaration(
			target,
			before,
			identifier,
			name,
			kind
		);
		if (
			blockDeclaration
				? (earlier & ~(1 << DECLARES_LAMBDA)) !== 0
				: (earlier & LEXICAL_DECLARATIONS) !== 0
		) {
			this.raise(identifier, `"${name}" is redeclared`);
		}
		if (kind !== DECLARES_FUNARG) this._markExport(variable, 2);
		if (defun !== scope) {
			encloseVariable(scope, variable);
			const found = /** @type {MinifierVariable} */ (
				findMinifierVariable(scope, name)
			);
			if (found !== variable) {
				identifier.definition = found;
				this._referenceVariable(identifier, scope, found);
			}
		}
		if (kind === DECLARES_CATCH) {
			this._addReference(identifier, REFERENCE_CATCH);
			if (this.legacyCatch) {
				this.catchNames.push(identifier);
				this.catchScopes.push(scope);
			} else {
				this.catchParameters.push(identifier);
				this.catchParameterScopeCounts.push(this.scopeCount);
			}
		}
	}

	/**
	 * @param {PrintNode[]} nodes statements, arguments or a template's segments
	 * @returns {void}
	 */
	_visitList(nodes) {
		for (let i = 0; i < nodes.length; i++) this._visitPrint(nodes[i]);
	}

	/**
	 * @param {PrintFunction} node a function
	 * @returns {void}
	 */
	_visitMinifierFunction(node) {
		const outerStrict = this.strict;
		const outer = /** @type {MinifierScope} */ (this.scope);
		const outerLabels = this.labelsInScope;
		const stack = this.stack;
		if (
			node.type === "FunctionDeclaration" &&
			!isStatementScope(stack[stack.length - 1])
		) {
			this.blockDefunScopes.add(
				/** @type {MinifierScope} */ (outer.variableScope)
			);
		}
		stack.push(node);
		const lambda = this._open("function", node, true);
		if (node.type !== "ArrowFunctionExpression") {
			this._defineVariable(lambda, null, "arguments", DECLARES_FUNARG);
		}
		this.labelsInScope = new Map();
		const { id } = node;
		if (!id) {
			// An arrow or a method has no name of its own.
		} else if (id.role === "defun") {
			this._markExport(
				this._defineVariable(
					this.strict
						? outer
						: /** @type {MinifierScope} */ (outer.variableScope),
					id,
					id.name,
					DECLARES_DEFUN
				),
				1
			);
		} else {
			this._defineVariable(lambda, id, id.name, DECLARES_LAMBDA);
		}
		if (id && node.type === "FunctionExpression") {
			lambda.functionName = /** @type {MinifierVariable} */ (id.definition);
		}
		const { params } = node;
		const ranged = this.parameterScopes && params.length !== 0;
		if (ranged) {
			lambda.parameterStart = this.referenceNodes.length;
			this.parameterRanges.push(lambda);
		}
		for (let i = 0; i < params.length; i++) {
			this._visitBinding(params[i], DECLARES_FUNARG);
		}
		if (ranged) lambda.parameterEnd = this.referenceNodes.length;
		if (this.release !== undefined) this.release(node.body);
		this._visitList(node.body.body);
		this.scope = outer;
		this.labelsInScope = outerLabels;
		this.strict = outerStrict;
		stack.pop();
	}

	/**
	 * @param {PrintClass} node a class
	 * @returns {void}
	 */
	_visitMinifierClass(node) {
		const outerStrict = this.strict;
		const outer = /** @type {MinifierScope} */ (this.scope);
		const outerLabels = this.labelsInScope;
		this.stack.push(node);
		this.strict = true;
		const classScope = this._open("class", node, true);
		this.labelsInScope = new Map();
		const { id } = node;
		if (id) {
			this._markExport(
				id.role === "defClass"
					? this._defineVariable(outer, id, id.name, DECLARES_DEF_CLASS)
					: this._defineVariable(classScope, id, id.name, DECLARES_CLASS),
				1
			);
		}
		if (node.superClass) this._visitPrint(node.superClass);
		this._visitList(node.body.body);
		this.scope = outer;
		this.labelsInScope = outerLabels;
		this.strict = outerStrict;
		this.stack.pop();
	}

	/**
	 * A call under `ie8` or `safari10`, whose catch parameters terser's
	 * `walk` meets callee first, where its `_walk` meets the arguments first.
	 * @param {PrintCallExpression | PrintNewExpression} node the call
	 * @returns {void}
	 */
	_visitLegacyCall(node) {
		const { catchNames, catchScopes } = this;
		this.stack.push(node);
		const argumentsStart = catchNames.length;
		this._visitList(node.arguments);
		const calleeStart = catchNames.length;
		this._visitPrint(node.callee);
		if (argumentsStart < calleeStart && calleeStart < catchNames.length) {
			catchNames.splice(argumentsStart, 0, ...catchNames.splice(calleeStart));
			catchScopes.splice(argumentsStart, 0, ...catchScopes.splice(calleeStart));
		}
		this.stack.pop();
	}

	/**
	 * A loop's children, its scope entered.
	 * @param {PrintForStatement | PrintForInStatement | PrintForOfStatement | PrintWhileStatement} node the loop
	 * @returns {void}
	 */
	_visitLoop(node) {
		switch (node.type) {
			case "ForStatement":
				if (node.init) this._visitPrint(node.init);
				if (node.test) this._visitPrint(node.test);
				if (node.update) this._visitPrint(node.update);
				break;
			case "WhileStatement":
				this._visitPrint(node.test);
				break;
			case "DoWhileStatement":
				this._visitPrint(node.body);
				this._visitPrint(node.test);
				return;
			default:
				this._visitBinding(node.left, 0);
				this._visitPrint(node.right);
		}
		this._visitPrint(node.body);
	}

	/**
	 * @param {PrintVariableDeclaration} node a `var`, `let`, `const` or `using`
	 * @returns {void}
	 */
	_visitDeclaration(node) {
		const kind =
			node.kind === "var"
				? DECLARES_VAR
				: node.kind === "let"
					? DECLARES_LET
					: node.kind === "const"
						? DECLARES_CONST
						: DECLARES_USING;
		const { stack, functionDeclarators } = this;
		stack.push(node);
		const { declarations } = node;
		for (let i = 0; i < declarations.length; i++) {
			const declarator = /** @type {PrintVariableDeclarator} */ (
				declarations[i]
			);
			const { id, init } = declarator;
			if (
				functionDeclarators !== null &&
				kind !== DECLARES_USING &&
				id.type === "Identifier" &&
				init &&
				(init.type === "FunctionExpression" ||
					init.type === "ArrowFunctionExpression") &&
				!init.id
			) {
				functionDeclarators.push(id);
			}
			stack.push(declarator);
			this._visitBinding(id, kind);
			if (init) this._visitPrint(init);
			stack.pop();
		}
		stack.pop();
	}

	/**
	 * @param {Node} node node to visit
	 * @returns {void}
	 */
	_visit(node) {
		// the shared walk's way back in, for the children of what it reads
		this._visitPrint(/** @type {PrintNode} */ (/** @type {unknown} */ (node)));
	}

	/**
	 * Reads what is scoped as webpack does with the shared walk, pushed as
	 * terser's walk pushes it, and the rest as terser's analysis does.
	 * @param {PrintNode} current node to visit
	 * @returns {void}
	 */
	_visitPrint(current) {
		if (this.release !== undefined) this.release(current);
		const stack = this.stack;
		switch (current.type) {
			case "Identifier": {
				if (current.atom === true) return;
				const parent = stack[stack.length - 1];
				this._addReference(
					current,
					current.name === "eval" &&
						(parent.type === "CallExpression" ||
							parent.type === "NewExpression")
						? REFERENCE_CALLED
						: 0
				);
				return;
			}
			// the commonest kinds first: the chain is a sequence of comparisons
			case "MemberExpression":
				stack.push(current);
				this._visitPrint(current.object);
				if (current.computed) this._visitPrint(current.property);
				stack.pop();
				return;
			case "CallExpression":
			case "NewExpression":
				if (this.legacyCatch) {
					this._visitLegacyCall(current);
					return;
				}
				// terser's walk reaches the arguments first.
				stack.push(current);
				this._visitList(current.arguments);
				this._visitPrint(current.callee);
				stack.pop();
				return;
			case "Literal":
			case "ThisExpression":
				return;
			case "ExpressionStatement":
				if (typeof current.directive === "string") {
					if (current.directive === "use strict") this.strict = true;
					return;
				}
				stack.push(current);
				this._visitPrint(current.expression);
				stack.pop();
				return;
			case "BinaryExpression":
			case "LogicalExpression":
			case "AssignmentExpression":
				stack.push(current);
				this._visitPrint(current.left);
				this._visitPrint(current.right);
				stack.pop();
				return;
			case "BlockStatement": {
				stack.push(current);
				const outer = this._enterBlock("block", current);
				this._visitList(current.body);
				this.scope = outer;
				stack.pop();
				return;
			}
			case "ReturnStatement":
			case "UnaryExpression":
			case "UpdateExpression":
			case "ThrowStatement":
			case "AwaitExpression":
			case "SpreadElement":
			case "YieldExpression":
				stack.push(current);
				if (current.argument) this._visitPrint(current.argument);
				stack.pop();
				return;
			case "VariableDeclaration":
				this._visitDeclaration(current);
				return;
			case "FunctionDeclaration":
			case "FunctionExpression":
			case "ArrowFunctionExpression":
				this._visitMinifierFunction(current);
				return;
			case "ClassDeclaration":
			case "ClassExpression":
				this._visitMinifierClass(current);
				return;
			case "ForStatement":
			case "ForInStatement":
			case "ForOfStatement":
			case "WhileStatement":
			case "DoWhileStatement": {
				stack.push(current);
				const outer = this._enterBlock(
					current.type.startsWith("For") ? "for" : "block",
					current
				);
				if (this.safari10 && current.type.startsWith("For")) {
					this.forScopes.push(/** @type {MinifierScope} */ (this.scope));
				}
				this._visitLoop(current);
				this.scope = outer;
				stack.pop();
				return;
			}
			case "SwitchStatement": {
				stack.push(current);
				const outer = this._enterBlock("switch", current);
				// The switched expression belongs to the scope around the switch.
				const block = this.scope;
				this.scope = outer;
				this._visitPrint(current.discriminant);
				this.scope = block;
				this._visitList(current.cases);
				this.scope = outer;
				stack.pop();
				return;
			}
			case "CatchClause": {
				stack.push(current);
				const outer = this._enterBlock("catch", current);
				const catchScope = /** @type {MinifierScope} */ (this.scope);
				const ranged = this.parameterScopes && Boolean(current.param);
				if (ranged) {
					catchScope.parameterStart = this.referenceNodes.length;
					this.parameterRanges.push(catchScope);
				}
				if (current.param) this._visitBinding(current.param, DECLARES_CATCH);
				if (ranged) catchScope.parameterEnd = this.referenceNodes.length;
				if (this.release !== undefined) this.release(current.body);
				this._visitList(current.body.body);
				this.scope = outer;
				stack.pop();
				return;
			}
			case "StaticBlock": {
				const outer = this.scope;
				const outerLabels = this.labelsInScope;
				stack.push(current);
				this._open("class-static-block", current, true);
				this.labelsInScope = new Map();
				this._visitList(current.body);
				this.scope = outer;
				this.labelsInScope = outerLabels;
				stack.pop();
				return;
			}
			case "LabeledStatement": {
				const labelName = /** @type {PrintIdentifier} */ (current.label);
				const { name } = labelName;
				if (this.labelsInScope.has(name)) {
					throw new Error(`Label ${name} defined twice`);
				}
				const label = new MinifierLabel(name, this.currentLabel);
				this.labels.push(label);
				if (this.release !== undefined) this.release(labelName);
				labelName.definition = label;
				this.labelsInScope.set(name, label);
				stack.push(current);
				this.currentLabel = label;
				this._visitPrint(current.body);
				this.currentLabel = label.parent;
				stack.pop();
				this.labelsInScope.delete(name);
				return;
			}
			case "BreakStatement":
			case "ContinueStatement": {
				const name = /** @type {PrintIdentifier | null} */ (current.label);
				if (!name) return;
				const label = this.labelsInScope.get(name.name);
				if (label === undefined) {
					const start = /** @type {Token} */ (name.startToken);
					throw new Error(
						`Undefined label ${name.name} [${start.line},${start.col}]`
					);
				}
				if (this.release !== undefined) this.release(name);
				name.definition = label;
				return;
			}
			case "WithStatement":
				for (
					let outer = /** @type {MinifierScope | null} */ (this.scope);
					outer !== null;
					outer = /** @type {MinifierScope | null} */ (outer.upper)
				) {
					outer.usesWith = true;
				}
				stack.push(current);
				this._visitPrint(current.object);
				this._visitPrint(current.body);
				stack.pop();
				return;
			case "Property":
			case "PropertyDefinition":
				stack.push(current);
				if (current.computed) this._visitPrint(current.key);
				if (current.value) this._visitPrint(current.value);
				stack.pop();
				return;
			case "ObjectPattern":
			case "ArrayPattern":
			case "AssignmentPattern":
			case "RestElement":
				this._visitBinding(current, 0);
				return;
			case "TemplateLiteral":
				stack.push(current);
				this._visitList(current.segments);
				stack.pop();
				return;
			case "ImportExpression":
				stack.push(current);
				this._visitList(current.args);
				stack.pop();
				return;
			case "IfStatement":
			case "ConditionalExpression":
			case "SwitchCase":
			case "ArrayExpression":
			case "ObjectExpression":
			case "MethodDefinition":
			case "SequenceExpression":
			case "TaggedTemplateExpression":
			case "ChainExpression":
			case "TryStatement":
				// scoped alike, so read by the shared walk, pushed as terser's walk does
				stack.push(current);
				super._visit(/** @type {Node} */ (/** @type {unknown} */ (current)));
				stack.pop();
				return;
			case "Super":
			case "EmptyStatement":
			case "DebuggerStatement":
			case "MetaProperty":
			case "PrivateIdentifier":
			case "TemplateElement":
				return;
			case "ImportDeclaration": {
				this._checkModuleStatement(current, "Import");
				stack.push(current);
				// terser holds a default import's name with no node around it.
				if (current.imported_name) {
					this._declare(current.imported_name, DECLARES_IMPORT);
				}
				const names = current.imported_names;
				if (names) {
					for (let i = 0; i < names.length; i++) {
						const specifier = names[i];
						stack.push(specifier);
						this._declare(
							/** @type {PrintIdentifier} */ (specifier.local),
							DECLARES_IMPORT
						);
						stack.pop();
					}
				}
				stack.pop();
				return;
			}
			case "ExportNamedDeclaration": {
				this._checkModuleStatement(current, "Export");
				stack.push(current);
				const declaration =
					current.exported_value || current.exported_definition;
				if (declaration) this._visitPrint(declaration);
				const fromModule = Boolean(current.source);
				const specifiers = current.exported_names;
				if (specifiers) {
					for (let i = 0; i < specifiers.length; i++) {
						const specifier = specifiers[i];
						stack.push(specifier);
						this._addReference(
							/** @type {PrintIdentifier | PrintLiteral} */ (specifier.local),
							fromModule
								? REFERENCE_EXPORTED | REFERENCE_FROM_MODULE
								: REFERENCE_EXPORTED
						);
						stack.pop();
					}
				}
				stack.pop();
				return;
			}
			case "ExportDefaultDeclaration":
				this._checkModuleStatement(current, "Export");
				stack.push(current);
				this._visitPrint(
					/** @type {PrintNode} */ (
						current.exported_value || current.exported_definition
					)
				);
				stack.pop();
				return;
			case "ExportAllDeclaration":
				// terser's `*` reads a global no name in the output depends on.
				this._checkModuleStatement(current, "Export");
				return;
			default:
				throw new Error(
					`The minifier's scope analysis cannot read a ${current.type} node`
				);
		}
	}

	/**
	 * Drops the ranges of parameter reads this analysis counted.
	 * @returns {void}
	 */
	_clearParameterRanges() {
		const { parameterRanges } = this;
		for (let i = 0; i < parameterRanges.length; i++) {
			parameterRanges[i].parameterStart = -1;
			parameterRanges[i].parameterEnd = -1;
		}
		parameterRanges.length = 0;
	}

	/**
	 * Resolves each name read, finds `eval`, and encloses what a catch
	 * parameter redefines, then moves the catch parameters old engines scope
	 * to their function.
	 * @returns {void}
	 */
	_resolveMinifier() {
		const { referenceNodes, referenceScopes, referenceFlags, globals } = this;
		for (let i = 0; i < referenceNodes.length; i++) {
			const node = referenceNodes[i];
			const from = referenceScopes[i];
			const flags = referenceFlags[i];
			if (flags & REFERENCE_CATCH) {
				// The definition a catch parameter redefines in its function's scope.
				const redefinition = /** @type {MinifierVariable | undefined} */ (
					from.variableScope.getBinding(
						/** @type {PrintIdentifier} */ (node).name
					)
				);
				if (redefinition !== undefined) encloseVariable(from, redefinition);
				continue;
			}
			const { name } = node;
			if (flags & REFERENCE_CALLED) {
				for (
					let outer = /** @type {MinifierScope | null} */ (from);
					outer !== null && !outer.usesEval;
					outer = /** @type {MinifierScope | null} */ (outer.upper)
				) {
					outer.usesEval = true;
				}
			}
			let variable =
				flags & REFERENCE_FROM_MODULE
					? undefined
					: findMinifierVariable(from, name, i);
			if (variable === undefined) {
				variable = globals.get(name);
				if (variable === undefined) {
					variable = new MinifierVariable(name, this.toplevel, DECLARES_GLOBAL);
					variable.undeclared = true;
					variable.global = true;
					globals.set(name, variable);
				}
				if (flags & REFERENCE_EXPORTED) variable.export = EXPORT_KEEP_NAME;
			}
			if (node.type === "Identifier") {
				node.definition = variable;
				this._referenceVariable(node, from, variable);
			} else {
				// A re-exported string reads a global, which keeps no references.
				encloseVariable(from, variable);
			}
		}

		this._clearParameterRanges();

		// Passes 3 and 4: work around old engines' catch and loop scopes.
		const { catchNames, catchScopes } = this;
		for (let i = 0; i < catchNames.length; i++) {
			const identifier = catchNames[i];
			const { name } = identifier;
			const references = /** @type {MinifierVariable} */ (identifier.definition)
				.references;
			const defunScope = /** @type {MinifierScope} */ (
				catchScopes[i].variableScope
			);
			const variable =
				findMinifierVariable(defunScope, name) ||
				globals.get(name) ||
				this._defineVariable(defunScope, null, name, DECLARES_CATCH);
			// As terser's `forEach`: referencing appends to the list it reads.
			const { length } = references;
			for (let j = 0; j < length; j++) {
				const read = /** @type {PrintIdentifier} */ (
					/** @type {unknown} */ (references[j].identifier)
				);
				read.definition = variable;
				this._referenceVariable(
					read,
					/** @type {MinifierScope} */ (references[j].from),
					variable
				);
			}
			identifier.definition = variable;
			this._referenceVariable(identifier, catchScopes[i], variable);
		}
		const { forScopes } = this;
		for (let i = 0; i < forScopes.length; i++) {
			const forScope = forScopes[i];
			const variables = /** @type {MinifierScope} */ (forScope.upper).variables;
			for (let j = 0; j < variables.length; j++) {
				encloseUnique(forScope, /** @type {MinifierVariable} */ (variables[j]));
			}
		}
	}
}

/**
 * Analyses the minifier's tree with terser's scoping, which the names it
 * hands out depend on: see `MinifierScopeAnalyzer`.
 * @param {PrintProgram} program the tree, its names as written
 * @param {MinifierScopeOptions} options the mangle options
 * @param {(node: PrintNode, message: string) => never} raise throws the parse error a misplaced declaration is
 * @param {((node: PrintNode) => void)=} release drops what only the compressor read off each node read, where nobody keeps the tree
 * @returns {MinifierScopeAnalysis} the scopes
 */
const analyzeMinifierScope = (program, options, raise, release) => {
	const analyzer = new MinifierScopeAnalyzer(program, options, raise, release);
	if (release !== undefined) release(program);
	analyzer.stack.push(program);
	analyzer._visitList(program.body);
	analyzer.stack.pop();
	analyzer._resolveMinifier();
	return {
		toplevel: analyzer.toplevel,
		labels: analyzer.labels,
		globals: analyzer.globals,
		blockDefunScopes: analyzer.blockDefunScopes,
		functionDeclarators: analyzer.functionDeclarators,
		catchParameters: analyzer.catchParameters,
		catchParameterScopeCounts: analyzer.catchParameterScopeCounts
	};
};

// The declarations whose name a block keeps: a read of any other name from a
// block is the function's, as terser re-points it.
const BLOCK_DECLARATIONS =
	(1 << DECLARES_LET) |
	(1 << DECLARES_CONST) |
	(1 << DECLARES_USING) |
	(1 << DECLARES_CATCH) |
	(1 << DECLARES_DEF_CLASS) |
	(1 << DECLARES_IMPORT);

// The declarations naming a function, which terser's `def_function` defines.
const FUNCTION_DECLARATIONS =
	(1 << DECLARES_LAMBDA) | (1 << DECLARES_DEFUN) | (1 << DECLARES_DEF_CLASS);

/**
 * What the compressor's analysis asks of its tree's nodes, which only the
 * tree's kinds answer.
 * @typedef {object} CompressorDialect
 * @property {(node: CompressorNode) => boolean} isSymbol whether a node is one of terser's symbols, which records its scope
 * @property {(node: CompressorNode) => boolean} isFunction whether a node is a function expression, not a method
 * @property {(node: CompressorNode) => boolean} isDefun whether a node is a function declaration
 * @property {(node: CompressorNode) => boolean} isObjectKeyValue whether a property is a plain key and value, its key a name only where computed
 * @property {(node: CompressorNode) => boolean} isPrivateField whether a class field is a private one, its key no symbol
 * @property {(lambda: CompressorNode) => CompressorNode} argumentsSymbol the symbol a function's own `arguments` is declared by
 */

/**
 * The compressor's analysis: the minifier's, recording what terser's
 * `figure_out_scope` gives the compressor besides. Each scope is a
 * `CompressorScope` its node holds, each definition a `CompressorVariable`
 * with its declaring symbols, its value and its reads, and each symbol its
 * scope; a label is its own definition, its `break`s and `continue`s its
 * references.
 */
class CompressorScopeAnalyzer extends MinifierScopeAnalyzer {
	/**
	 * @param {CompressorNode} root the program, or a function or class analysed again
	 * @param {MinifierScopeOptions} options the options
	 * @param {(node: PrintNode, message: string) => never} raise throws the parse error a misplaced declaration is
	 * @param {CompressorDialect} dialect what the tree's kinds answer
	 * @param {CompressorScopeShape} parentScope the scope the root sits in, the program's own for the program
	 * @param {CompressorScopeShape} toplevel the program's scope
	 */
	constructor(root, options, raise, dialect, parentScope, toplevel) {
		super(
			/** @type {PrintProgram} */ (/** @type {unknown} */ (root)),
			{
				ie8: options.ie8,
				safari10: options.safari10,
				module: options.module,
				parameterScopes: options.parameterScopes
			},
			raise,
			undefined
		);
		/** @type {CompressorDialect} */
		this.dialect = dialect;
		this.toplevel = /** @type {MinifierScope} */ (
			/** @type {unknown} */ (toplevel)
		);
		this.scope = /** @type {MinifierScope} */ (
			/** @type {unknown} */ (parentScope)
		);
		// The program's node holds its globals, as terser's did.
		this.globals = /** @type {Map<string, MinifierVariable>} */ (
			/** @type {CompressorNode} */ (/** @type {unknown} */ (toplevel.node))
				.globals
		);
	}

	/**
	 * @param {ScopeType} type what opens it
	 * @param {PrintNode} node the node opening it
	 * @param {boolean} isVarScope whether `var` hoists to here
	 * @returns {MinifierScope} the scope, now current
	 */
	_open(type, node, isVarScope) {
		const opener = /** @type {CompressorNode} */ (
			/** @type {unknown} */ (node)
		);
		const scope = createCompressorScope(
			type,
			opener,
			/** @type {CompressorScopeShape | null} */ (
				/** @type {unknown} */ (this.scope)
			),
			isVarScope
		);
		// eslint-disable-next-line camelcase -- terser's name, which the compressor reads
		opener.block_scope = scope;
		this.scopeCount++;
		this.scope = /** @type {MinifierScope} */ (/** @type {unknown} */ (scope));
		return this.scope;
	}

	/**
	 * terser's `def_variable`, the scope's binding of the name already looked up.
	 * @param {MinifierScope} target the scope declaring it
	 * @param {MinifierVariable | undefined} variable what the scope binds the name to, if anything
	 * @param {PrintIdentifier | null} identifier the name declaring it, if written
	 * @param {string} name the name
	 * @param {number} kind how it is declared
	 * @returns {MinifierVariable} its definition, made or joined
	 */
	_addDeclaration(target, variable, identifier, name, kind) {
		const scope = /** @type {CompressorScopeShape} */ (
			/** @type {unknown} */ (target)
		);
		const opener = /** @type {CompressorNode} */ (
			/** @type {unknown} */ (/** @type {MinifierScope} */ (this.scope).node)
		);
		/** @type {CompressorNode | null | undefined} */
		let init;
		let symbol;
		if (identifier === null) {
			symbol = this.dialect.argumentsSymbol(opener);
		} else {
			symbol = /** @type {CompressorNode} */ (
				/** @type {unknown} */ (identifier)
			);
			if ((1 << kind) & (FUNCTION_DECLARATIONS | (1 << DECLARES_CLASS))) {
				// A function's or class's name, its scope where it is declared.
				symbol.scope = /** @type {CompressorNode} */ (
					/** @type {unknown} */ (scope)
				);
				// A function expression named `arguments` is not its own value.
				init =
					kind === DECLARES_LAMBDA && name === "arguments" ? undefined : opener;
			} else if (kind !== DECLARES_FUNARG && kind !== DECLARES_IMPORT) {
				init = null;
			}
		}
		let definition = /** @type {CompressorDefinition | undefined} */ (
			/** @type {unknown} */ (variable)
		);
		if (definition !== undefined) {
			definition.declarations |= 1 << kind;
			definition.identifiers.push(symbol);
			if (
				definition.init &&
				(definition.scope !== /** @type {unknown} */ (symbol.scope) ||
					this.dialect.isFunction(definition.init))
			) {
				definition.init = init;
			}
		} else {
			definition = createCompressorDefinition(name, scope, kind, symbol, init);
			definition.global = scope.upper === null;
			scope.bind(definition);
		}
		if (
			(1 << kind) & FUNCTION_DECLARATIONS &&
			(!definition.init || this.dialect.isDefun(definition.init))
		) {
			definition.init = init;
		}
		symbol.definition = definition;
		return /** @type {MinifierVariable} */ (
			/** @type {unknown} */ (definition)
		);
	}

	/**
	 * terser's `reference`.
	 * @param {PrintIdentifier} identifier the name read
	 * @param {MinifierScope} from the scope reading it
	 * @param {MinifierVariable} variable what it reads
	 * @returns {void}
	 */
	_referenceVariable(identifier, from, variable) {
		/** @type {CompressorDefinition} */ (
			/** @type {unknown} */ (variable)
		).references.push(
			/** @type {CompressorNode} */ (/** @type {unknown} */ (identifier))
		);
		encloseVariable(from, variable);
	}

	/**
	 * A `var`, parameter, `let`, `const`, `using`, catch parameter or import.
	 * @param {PrintIdentifier} identifier the name declared
	 * @param {number} kind how, as a `DECLARES_*` code
	 * @returns {void}
	 */
	_declare(identifier, kind) {
		/** @type {CompressorNode} */ (/** @type {unknown} */ (identifier)).scope =
			/** @type {CompressorNode} */ (/** @type {unknown} */ (this.scope));
		super._declare(identifier, kind);
	}

	/**
	 * @param {PrintIdentifier | PrintLiteral} node a name read, or a re-exported string
	 * @param {number} flags what else is known of it, as `REFERENCE_*` bits
	 * @returns {void}
	 */
	_addReference(node, flags) {
		// The name holds the scope it is read in, as its `scope`.
		this.referenceNodes.push(node);
		this.referenceFlags.push(flags);
	}

	/**
	 * Records the scope of a symbol the walk reaches but the minifier's does not
	 * read: a member's name, a label, or a name an import or export maps.
	 * @param {PrintNode | CompressorNode | null | undefined} node a node, if any
	 * @returns {void}
	 */
	_recordScope(node) {
		if (node === null || node === undefined) return;
		const symbol = /** @type {CompressorNode} */ (
			/** @type {unknown} */ (node)
		);
		if (this.dialect.isSymbol(symbol)) {
			symbol.scope = /** @type {CompressorNode} */ (
				/** @type {unknown} */ (this.scope)
			);
		}
	}

	/**
	 * Reads what is scoped as webpack does with the shared walk, pushed as
	 * terser's walk pushes it, and the rest as terser's analysis does.
	 * @param {PrintNode} current node to visit
	 * @returns {void}
	 */
	_visitPrint(current) {
		const node = /** @type {CompressorNode} */ (
			/** @type {unknown} */ (current)
		);
		switch (current.type) {
			case "Identifier":
			case "ThisExpression":
			case "Super":
			case "PrivateIdentifier":
			case "Literal":
				this._recordScope(current);
				break;
			case "MethodDefinition":
				if (!current.computed) this._recordScope(current.key);
				break;
			case "Property":
				if (
					!current.computed &&
					!this.dialect.isObjectKeyValue(
						/** @type {CompressorNode} */ (/** @type {unknown} */ (current))
					)
				) {
					this._recordScope(current.key);
				}
				break;
			case "PropertyDefinition":
				if (
					!current.computed &&
					!this.dialect.isPrivateField(
						/** @type {CompressorNode} */ (/** @type {unknown} */ (current))
					)
				) {
					this._recordScope(current.key);
				}
				break;
			case "LabeledStatement":
				this._visitLabeled(node);
				return;
			case "BreakStatement":
			case "ContinueStatement":
				this._visitLoopControl(node);
				return;
			case "ImportDeclaration":
				this._visitNameMappings(node.imported_names);
				break;
			case "ExportNamedDeclaration":
				this._visitNameMappings(node.exported_names);
				break;
			case "ExportAllDeclaration":
				this._visitExportAll(node);
				return;
		}
		super._visitPrint(current);
	}

	/**
	 * @param {CompressorNode[] | null | undefined} mappings an import's or export's names
	 * @returns {void}
	 */
	_visitNameMappings(mappings) {
		if (!mappings) return;
		for (let i = 0; i < mappings.length; i++) {
			const mapping = mappings[i];
			this._recordScope(mapping.imported);
			this._recordScope(mapping.exported);
			this._recordScope(mapping.local);
		}
	}

	/**
	 * An `export *`, whose names read terser's `*` global.
	 * @param {CompressorNode} node the export
	 * @returns {void}
	 */
	_visitExportAll(node) {
		const exported = /** @type {PrintNode} */ (/** @type {unknown} */ (node));
		this._checkModuleStatement(exported, "Export");
		/** @type {CompressorNode[]} */
		const names = node.exported_names;
		this._visitNameMappings(names);
		const stack = this.stack;
		stack.push(exported);
		for (let i = 0; i < names.length; i++) {
			const mapping = names[i];
			stack.push(/** @type {PrintNode} */ (/** @type {unknown} */ (mapping)));
			this._addReference(
				/** @type {PrintIdentifier} */ (mapping.local),
				REFERENCE_EXPORTED | REFERENCE_FROM_MODULE
			);
			stack.pop();
		}
		stack.pop();
	}

	/**
	 * A labeled statement, its label its own definition.
	 * @param {CompressorNode} node the statement
	 * @returns {void}
	 */
	_visitLabeled(node) {
		const { label } = node;
		const { name } = label;
		const labels = /** @type {Map<string, CompressorNode>} */ (
			/** @type {unknown} */ (this.labelsInScope)
		);
		if (labels.has(name)) throw new Error(`Label ${name} defined twice`);
		this._recordScope(label);
		// A label's definition is the label itself.
		label.definition = /** @type {CompressorDefinition} */ (
			/** @type {unknown} */ (label)
		);
		label.references = [];
		labels.set(name, label);
		this.stack.push(/** @type {PrintNode} */ (/** @type {unknown} */ (node)));
		this._visitPrint(node.body);
		this.stack.pop();
		labels.delete(name);
	}

	/**
	 * A `break` or `continue`, one of its label's references.
	 * @param {CompressorNode} node the statement
	 * @returns {void}
	 */
	_visitLoopControl(node) {
		const name = /** @type {CompressorNode | null} */ (node.label);
		if (!name) return;
		this._recordScope(name);
		const label = /** @type {Map<string, CompressorNode>} */ (
			/** @type {unknown} */ (this.labelsInScope)
		).get(name.name);
		if (label === undefined) {
			const start = /** @type {Token} */ (name.startToken);
			throw new Error(
				`Undefined label ${name.name} [${start.line},${start.col}]`
			);
		}
		name.definition = /** @type {CompressorDefinition} */ (
			/** @type {unknown} */ (label)
		);
		label.references.push(node);
	}

	/**
	 * Resolves each name read as terser's compressor reads it: the definition's
	 * reads, a function's own `arguments` read, and a read from a block of a
	 * name the block does not keep moved to the function's scope.
	 * @returns {void}
	 */
	_resolveCompressor() {
		const { referenceNodes, referenceFlags } = this;
		const globals = /** @type {Map<string, CompressorDefinition>} */ (
			/** @type {unknown} */ (this.globals)
		);
		const toplevel = /** @type {CompressorScopeShape} */ (
			/** @type {unknown} */ (this.toplevel)
		);
		for (let i = 0; i < referenceNodes.length; i++) {
			const node = /** @type {CompressorNode} */ (
				/** @type {unknown} */ (referenceNodes[i])
			);
			const from = /** @type {MinifierScope} */ (
				/** @type {unknown} */ (node.scope)
			);
			const flags = referenceFlags[i];
			const { name } = node;
			if (flags & REFERENCE_CATCH) {
				const redefinition = /** @type {MinifierVariable | undefined} */ (
					from.variableScope.getBinding(name)
				);
				if (redefinition !== undefined) encloseVariable(from, redefinition);
				continue;
			}
			if (flags & REFERENCE_CALLED) {
				for (
					let outer = /** @type {MinifierScope | null} */ (from);
					outer !== null && !outer.usesEval;
					outer = /** @type {MinifierScope | null} */ (outer.upper)
				) {
					outer.usesEval = true;
				}
			}
			let definition = /** @type {CompressorDefinition | undefined} */ (
				/** @type {unknown} */ (
					flags & REFERENCE_FROM_MODULE
						? undefined
						: findMinifierVariable(from, name, i)
				)
			);
			if (definition === undefined) {
				definition = globals.get(name);
				if (definition === undefined) {
					definition = createCompressorDefinition(
						name,
						toplevel,
						DECLARES_GLOBAL,
						node,
						undefined
					);
					definition.undeclared = true;
					definition.global = true;
					globals.set(name, definition);
				}
				if (flags & REFERENCE_EXPORTED) definition.export = EXPORT_KEEP_NAME;
			} else if (name === "arguments" && definition.scope.type === "function") {
				definition.scope.getDefunScope().usesArguments = true;
			}
			node.definition = definition;
			definition.references.push(node);
			encloseVariable(
				from,
				/** @type {MinifierVariable} */ (/** @type {unknown} */ (definition))
			);
			if (
				from.variableScope !== from &&
				((1 << definition.kind) & BLOCK_DECLARATIONS) === 0
			) {
				node.scope = /** @type {CompressorNode} */ (
					/** @type {unknown} */ (from.variableScope)
				);
			}
		}

		this._clearParameterRanges();

		// Passes 3 and 4: work around old engines' catch and loop scopes.
		const { catchNames, catchScopes } = this;
		for (let i = 0; i < catchNames.length; i++) {
			const symbol = /** @type {CompressorNode} */ (
				/** @type {unknown} */ (catchNames[i])
			);
			const { name } = symbol;
			const { references } = symbol.definition;
			const defunScope = /** @type {CompressorScopeShape} */ (
				/** @type {unknown} */ (catchScopes[i].variableScope)
			);
			let definition = defunScope.findVariable(name) || globals.get(name);
			if (definition === undefined) {
				definition = createCompressorDefinition(
					name,
					defunScope,
					DECLARES_CATCH,
					symbol,
					undefined
				);
				definition.global = defunScope.upper === null;
				defunScope.bind(definition);
			}
			// As terser's `forEach`: referencing appends to the list it reads.
			const { length } = references;
			for (let j = 0; j < length; j++) {
				const read = references[j];
				read.definition = definition;
				read.scope.addReference(read);
			}
			symbol.definition = definition;
			symbol.scope.addReference(symbol);
		}
		const { forScopes } = this;
		for (let i = 0; i < forScopes.length; i++) {
			const forScope = forScopes[i];
			const variables = /** @type {MinifierScope} */ (forScope.upper).variables;
			for (let j = 0; j < variables.length; j++) {
				encloseUnique(forScope, /** @type {MinifierVariable} */ (variables[j]));
			}
		}
	}
}

/**
 * Analyses the compressor's tree, or a function or class of it again, with
 * terser's scoping, recording what the compressor reads: see
 * `CompressorScopeAnalyzer`.
 * @param {CompressorNode} root the program, or a function or class in it
 * @param {MinifierScopeOptions} options the options
 * @param {(node: PrintNode, message: string) => never} raise throws the parse error a misplaced declaration is
 * @param {CompressorDialect} dialect what the tree's kinds answer
 * @param {CompressorScopeShape | null} parentScope the scope the root sits in, unless it is the program
 * @param {CompressorNode} program the program
 * @returns {void}
 */
const analyzeCompressorScope = (
	root,
	options,
	raise,
	dialect,
	parentScope,
	program
) => {
	const isProgram = root === program;
	let toplevel;
	if (isProgram) {
		toplevel = createCompressorScope("global", root, null, true);
		root.globals = new Map();
		// eslint-disable-next-line camelcase -- terser's name, which the compressor reads
		root.block_scope = toplevel;
	} else {
		toplevel = program.block_scope;
	}
	const analyzer = new CompressorScopeAnalyzer(
		root,
		options,
		raise,
		dialect,
		isProgram ? toplevel : /** @type {CompressorScopeShape} */ (parentScope),
		toplevel
	);
	if (isProgram) {
		analyzer.stack.push(
			/** @type {PrintNode} */ (/** @type {unknown} */ (root))
		);
		analyzer._visitList(
			/** @type {PrintProgram} */ (/** @type {unknown} */ (root)).body
		);
	} else {
		// What a declaration's `export` is read off is not there.
		analyzer.stack.push(
			/** @type {PrintNode} */ (
				/** @type {unknown} */ (
					/** @type {CompressorScopeShape} */ (parentScope).node
				)
			)
		);
		analyzer._visitPrint(
			/** @type {PrintNode} */ (/** @type {unknown} */ (root))
		);
	}
	analyzer.stack.pop();
	analyzer._resolveCompressor();
};

analyzeScope.Reference = Reference;
analyzeScope.Scope = Scope;
analyzeScope.Variable = Variable;
analyzeScope.MinifierLabel = MinifierLabel;
analyzeScope.MinifierScope = MinifierScope;
analyzeScope.MinifierVariable = MinifierVariable;
analyzeScope.CompressorScope = CompressorScope;
analyzeScope.CompressorVariable = CompressorVariable;
analyzeScope.createCompressorDefinition = createCompressorDefinition;
analyzeScope.createCompressorScope = createCompressorScope;
analyzeScope.analyzeMinifierScope = analyzeMinifierScope;
analyzeScope.analyzeCompressorScope = analyzeCompressorScope;
analyzeScope.encloseUnique = encloseUnique;
analyzeScope.DECLARES_VAR = DECLARES_VAR;
analyzeScope.DECLARES_FUNARG = DECLARES_FUNARG;
analyzeScope.DECLARES_LET = DECLARES_LET;
analyzeScope.DECLARES_CONST = DECLARES_CONST;
analyzeScope.DECLARES_USING = DECLARES_USING;
analyzeScope.DECLARES_CATCH = DECLARES_CATCH;
analyzeScope.DECLARES_IMPORT = DECLARES_IMPORT;
analyzeScope.DECLARES_DEFUN = DECLARES_DEFUN;
analyzeScope.DECLARES_LAMBDA = DECLARES_LAMBDA;
analyzeScope.DECLARES_CLASS = DECLARES_CLASS;
analyzeScope.DECLARES_DEF_CLASS = DECLARES_DEF_CLASS;
analyzeScope.DECLARES_GLOBAL = DECLARES_GLOBAL;
analyzeScope.EXPORT_KEEP_NAME = EXPORT_KEEP_NAME;
analyzeScope.EXPORT_WANT_MANGLE = EXPORT_WANT_MANGLE;

module.exports = analyzeScope;
