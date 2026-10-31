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
		this.scope = /** @type {Scope} */ (/** @type {Scope | null} */ (null));
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
			variable.identifiers = [node];
		} else {
			variable.identifiers.push(node);
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
			const child = /** @type {NodeChildren} */ (
				/** @type {Node | NodeChildren} */ (node)
			)[key];
			if (child === null || typeof child !== "object") continue;
			if (Array.isArray(child)) {
				for (const item of child) {
					if (item !== null && typeof item === "object" && item.type) {
						this._visit(item);
					}
				}
			} else if (child.type) {
				this._visit(child);
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
						/** @type {Node | NodeChildren} */ (node)
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

/** @typedef {{ name: string, definition: TreeDefinition }} NamedIdentifier a name as the mangler reads it: as written, and its definition */

// How a minifier definition's name was declared, one code per kind of
// terser's declaring symbol; a global is a name nothing declares.
const DECLARES_VAR = 1;
const DECLARES_FUNARG = 2;
const DECLARES_LET = 3;
const DECLARES_CONST = 4;
const DECLARES_USING = 5;
const DECLARES_CATCH = 6;
const DECLARES_IMPORT = 7;

// What a name one long saves taking the name spelled beside it: a key's `:`
// and the name, or an import's or export's ` as ` and the name.
const SHORTHAND_SAVING = 2;
const AS_SAVING = 5;
// `spelledNames` collecting the names a key spells too, not only a module's.
const SPELLED_KEYS = 2;
// A name the mangler may hand out as it is spelled: one ASCII identifier, so it
// prints bare and costs a byte a character.
const SPELLABLE_NAME = /^[A-Za-z_$][\w$]*$/;
// Names no binding may take in strict code, a module's, beyond the keywords.
const NAMES_NO_BINDING_TAKES = new Set([
	"arguments",
	"await",
	"enum",
	"eval",
	"implements",
	"interface",
	"let",
	"package",
	"private",
	"protected",
	"public",
	"static",
	"yield"
]);
const DECLARES_DEFUN = 8;
const DECLARES_LAMBDA = 9;
const DECLARES_CLASS = 10;
const DECLARES_DEF_CLASS = 11;
const DECLARES_GLOBAL = 12;

// What the minifier's analysis records of a name read, replayed once all is
// declared.
const REFERENCE_CALLED = 1;
const REFERENCE_EXPORTED = 1 << 1;
const REFERENCE_FROM_MODULE = 1 << 2;
const REFERENCE_CATCH = 1 << 3;
// The name is written: assigned, updated or a loop's or pattern's target.
const REFERENCE_WRITTEN = 1 << 4;
// The name is a shorthand property's value, which spells its key too.
const REFERENCE_SHORTHAND = 1 << 5;
// The name is what a call calls, not a `new` or a tag.
const REFERENCE_CALLEE = 1 << 6;

// How an `export` naming a definition keeps its name.
const EXPORT_KEEP_NAME = 1;
const EXPORT_WANT_MANGLE = 2;

// Past this many definitions a scope's `enclosed` is also held as a set, so
// adding one stops scanning the list: a bundle's toplevel reaches thousands.
const ENCLOSED_INDEX_THRESHOLD = 16;
/** @type {WeakMap<MinifierVariable[], Set<MinifierVariable>>} */
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
	 * @param {number} node the node opening it
	 * @param {MinifierScope | null} upper the enclosing scope
	 * @param {boolean} isVarScope whether `var` and function declarations hoist to here
	 */
	constructor(type, node, upper, isVarScope) {
		super(
			type,
			/** @type {Node} */ (/** @type {Node | number} */ (node)),
			upper,
			isVarScope,
			false
		);
		/** @type {number} */
		this.node = node;
		/** @type {MinifierVariable[]} the definitions it or a scope inside it reads, in the order first read */
		this.enclosed = [];
		/** @type {number} how many names it has handed out, less one */
		this.cname = -1;
		/** @type {boolean} whether a direct `eval` can reach its names */
		this.usesEval = false;
		/** @type {boolean} whether a `with` can reach its names */
		this.usesWith = false;
		/** @type {Set<string> | null} the names a `with` body inside spells, null where unknown */
		this.withNames = null;
		/** @type {MinifierVariable | null} a function expression's own name */
		this.functionName = null;
		/** @type {number} the first name its parameter list reads, as the analysis counts them, or -1 */
		this.parameterStart = -1;
		/** @type {number} the name after the last its parameter list reads, or -1 */
		this.parameterEnd = -1;
	}

	/**
	 * terser's `pinned`.
	 * @returns {boolean} whether `eval` or `with` can reach its names
	 */
	isPinned() {
		return this.usesEval || this.usesWith;
	}
}

/**
 * One name declared in one scope, or a global: terser's `SymbolDef`, less
 * what only terser's compressor reads.
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
		/** @type {number} how many names read or write it, which the mangler gives the short names by */
		this.referenceCount = 0;
		/** @type {boolean} whether a name writes it, which a `SyntaxTree`'s analysis alone records */
		this.written = false;
	}
}

/**
 * Whether a definition is a variable rather than a label or another definition.
 * @param {MinifierVariable | MinifierLabel | import("./syntax-printer").NamedDefinition | null | undefined} value a definition
 * @returns {value is MinifierVariable} true when the value is a variable
 */
const isMinifierVariable = (value) => value instanceof MinifierVariable;

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
 * The options the minifier's analysis reads, its mangle options among them.
 * @typedef {object} MinifierScopeOptions
 * @property {boolean=} module whether the program is a module, so strict
 * @property {boolean=} ie8 whether catch parameters belong to their function
 * @property {boolean=} safari10 whether a loop's scope reads its parent's names, and catch parameters belong to their function
 * @property {boolean | RegExp=} keep_fnames which function names survive, collecting the declarators naming one
 * @property {boolean | RegExp=} keep_classnames which class names survive, collecting the declarators naming one under `classDeclarators`
 * @property {boolean=} classDeclarators whether, under `keep_classnames`, the names declarators give anonymous classes are kept as `keep_fnames` keeps a function's
 * @property {boolean=} parameterScopes whether names are scoped as the spec scopes them where terser does not: a parameter list's or a catch parameter's reads skip what the body declares, and a block's async or generator function stays in the block
 * @property {boolean=} withNames whether a scope a `with` reaches keeps only the names its body spells, mangling the rest
 * @property {number=} spelledNames which names to collect that the mangler may give the name beside them to write less: 1 for an import's or export's, 2 for a key's too
 * @property {boolean=} substitutesAliases whether each read of a `let` or `const` set to a name nothing writes reads that name instead, as the one pass prints it
 */

/**
 * @typedef {object} MinifierScopeAnalysis
 * @property {MinifierScope} toplevel the program's scope, its `childScopes` in the order the mangler walks them
 * @property {MinifierLabel[]} labels every label, in the same order
 * @property {Map<string, MinifierVariable>} globals the names nothing declares, in the order first read
 * @property {Set<MinifierScope>} blockDefunScopes the function scopes holding a function declared in a block
 * @property {NamedIdentifier[] | null} functionDeclarators under `keep_fnames`, the names declarators give anonymous functions, in the order the mangler asks `keep_fnames` of them
 * @property {NamedIdentifier[] | null} classDeclarators under `classDeclarators` and `keep_classnames`, the names declarators give anonymous classes
 * @property {NamedIdentifier[]} catchParameters unless `ie8` or `safari10` move them, the catch parameters, each named where the mangler's walk meets its scope
 * @property {boolean} namesPrivate whether the program names a private member, which renaming walks it for
 * @property {SpelledNames | null} spelledNames under `spelledNames`, the names a key or an import or export spells for a name beside it
 * @property {(number[] | null)=} aliases under `substitutesAliases`, the declarators whose name no read reads any more
 * @property {(number[] | null)=} movedFunctions under `substitutesAliases`, each declarator of a function read once and that read, in pairs: the read prints the function
 */

/**
 * Where a name stands beside one spelled for it: a property's key, which the
 * name as its value lets print alone, or an import's or export's other name.
 * @typedef {object} SpelledNames
 * @property {NamedIdentifier[]} identifiers each name, its `definition` read once the analysis resolves
 * @property {string[]} spellings the name spelled beside each
 * @property {number[]} savings the characters each saves, its own name one long, where it takes the name spelled
 */

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

// By `NodeType`, 1 for what lists statements, which run in their order.
/** @type {Uint8Array | undefined} */
let listsStatements;

/**
 * @param {number[]} loops each loop's start and end, in pairs
 * @param {number} from where a declaration starts
 * @param {number} start where a read after it starts
 * @param {number} end where that read ends
 * @returns {boolean} whether a loop holds the read but not the declaration
 */
const entersLoop = (loops, from, start, end) => {
	for (let i = 0; i < loops.length; i += 2) {
		if (loops[i] > from && loops[i] <= start && loops[i + 1] >= end) {
			return true;
		}
	}
	return false;
};

/**
 * @param {number[]} nodes the names read
 * @param {SyntaxTree} tree their tree
 * @returns {number[]} their indexes, ordered by where each starts
 */
const referencesByStart = (nodes, tree) =>
	nodes
		.map((node, i) => i)
		.sort((a, b) => tree.start(nodes[a]) - tree.start(nodes[b]));

/**
 * @param {number[]} byStart the indexes of the names read, ordered by start
 * @param {number[]} nodes the names read
 * @param {SyntaxTree} tree their tree
 * @param {number} start a position
 * @returns {number} where in the order the first name starting there or after is
 */
const firstFrom = (byStart, nodes, tree, start) => {
	let low = 0;
	let high = byStart.length;
	while (low < high) {
		const middle = (low + high) >>> 1;
		if (tree.start(nodes[byStart[middle]]) < start) low = middle + 1;
		else high = middle;
	}
	return low;
};

/**
 * @param {MinifierScope} outer a scope
 * @param {MinifierScope} inner another
 * @returns {boolean} whether the first is the second or holds it
 */
const encloses = (outer, inner) => {
	for (let scope = /** @type {Scope | null} */ (inner); scope !== null;) {
		if (scope === outer) return true;
		scope = scope.upper;
	}
	return false;
};

/**
 * @param {MinifierScope} from the scope a read is in
 * @param {MinifierVariable} variable a definition in a scope holding it
 * @returns {boolean} whether a scope between declares the definition's name, which a catch parameter then takes the mangled name of
 */
const shadowedFrom = (from, variable) => {
	for (
		let scope = /** @type {Scope | null} */ (from);
		scope !== null && scope !== variable.scope;
		scope = scope.upper
	) {
		if (scope.getBinding(variable.name) !== undefined) return true;
	}
	return false;
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
 * Marks each scope from one out as reached by a `with`, which keeps the names
 * its body spells as written; a scope reached already keeps what it knew.
 * @param {MinifierScope} from the scope the `with` is in
 * @param {boolean} collects whether the names are collected, else all are kept
 * @returns {void}
 */
const reachByWith = (from, collects) => {
	for (
		let scope = /** @type {MinifierScope | null} */ (from);
		scope !== null;
	) {
		if (!scope.usesWith) {
			scope.usesWith = true;
			scope.withNames = collects ? new Set() : null;
		}
		scope = /** @type {MinifierScope | null} */ (scope.upper);
	}
};

/**
 * Adds the names a `with` body spells to each scope from one out.
 * @param {MinifierScope} from the scope the `with` is in
 * @param {Set<string>} names the names its body spells
 * @returns {void}
 */
const keepWithNames = (from, names) => {
	for (
		let scope = /** @type {MinifierScope | null} */ (from);
		scope !== null;
	) {
		const kept = scope.withNames;
		if (kept !== null) for (const name of names) kept.add(name);
		scope = /** @type {MinifierScope | null} */ (scope.upper);
	}
};

/**
 * @typedef {import("./syntax-parser").SyntaxTree} SyntaxTree
 * @typedef {MinifierVariable | MinifierLabel | null} TreeDefinition
 */

/**
 * The scopes the minifier's analysis reads off a `SyntaxTree`: each name's
 * definition is held by its node's number.
 * @typedef {MinifierScopeAnalysis & { definitions: TreeDefinition[] }} MinifierTreeScopeAnalysis
 */

// The tree's tables, read when a first tree is analysed: wherever webpack
// reads a scope, requiring them would load the parser's data too.
/** @type {typeof import("./data").NodeType} */
let NodeType;
/** @type {typeof import("./data").Field} */
let Field;
/** @type {typeof import("./data").Flag} */
let Flag;
/** @type {typeof import("./data").Part} */
let Part;

/**
 * `MinifierScopeAnalyzer` over a `SyntaxTree` of the source terser's tree
 * was read from: the same walk, pushing the same nodes, so the same scopes,
 * definitions and orders. Under `ie8` or `safari10` catch parameters move to
 * their function in the walk's order, not the order terser walks a call in.
 */
class MinifierTreeScopeAnalyzer {
	/**
	 * @param {SyntaxTree} tree the tree
	 * @param {number} program its program
	 * @param {Uint8Array} types each node's type, as terser's tree types it
	 * @param {MinifierScopeOptions} options the mangle options
	 * @param {(node: number, message: string) => never} raise throws the parse error a misplaced import or export is
	 */
	constructor(tree, program, types, options, raise) {
		/** @type {SyntaxTree} */
		this.tree = tree;
		/** @type {Uint8Array} */
		this.types = types;
		/** @type {(node: number, message: string) => never} */
		this.raise = raise;
		/** @type {boolean} */
		this.parameterScopes = Boolean(options.parameterScopes);
		/** @type {MinifierScope[]} */
		this.parameterRanges = [];
		/** @type {MinifierScope} */
		this.toplevel = new MinifierScope("global", program, null, true);
		/** @type {MinifierScope} */
		this.scope = this.toplevel;
		/** @type {MinifierLabel[]} */
		this.labels = [];
		/** @type {Map<string, MinifierVariable>} */
		this.globals = new Map();
		/** @type {Set<MinifierScope>} */
		this.blockDefunScopes = new Set();
		/** @type {number[] | null} */
		this.functionDeclarators = options.keep_fnames ? [] : null;
		/** @type {number[] | null} */
		this.classDeclarators =
			options.classDeclarators && options.keep_classnames ? [] : null;
		/** @type {number[] | null} the `let` and `const` declarators set to a name */
		this.aliasDeclarators = options.substitutesAliases ? [] : null;
		/** @type {number[] | null} each declarator set to a function, and the start and end of the statements listing it */
		this.functionBindings = options.substitutesAliases ? [] : null;
		/** @type {number[] | null} each loop's start and end, in pairs */
		this.loopRanges = options.substitutesAliases ? [] : null;
		/** @type {number[]} */
		this.referenceNodes = [];
		/** @type {MinifierScope[]} */
		this.referenceScopes = [];
		/** @type {number[]} */
		this.referenceFlags = [];
		/** @type {number[]} */
		this.catchParameters = [];
		/** @type {boolean} */
		this.legacyCatch = Boolean(options.ie8 || options.safari10);
		/** @type {boolean} */
		this.safari10 = Boolean(options.safari10);
		/** @type {number[]} under `ie8` or `safari10`, the catch parameters in the walk's order */
		this.catchNames = [];
		/** @type {MinifierScope[]} the scope of each */
		this.catchScopes = [];
		/** @type {Map<MinifierVariable, { nodes: number[], scopes: MinifierScope[] }> | null} under `ie8` or `safari10`, the names resolved to each catch parameter, and the scope reading each */
		this.catchReads = this.legacyCatch ? new Map() : null;
		/** @type {MinifierScope[]} under `safari10`, the scopes of `for` loops */
		this.forScopes = [];
		/** @type {boolean} */
		this.namesPrivate = false;
		/** @type {number[]} the nodes terser's walk has pushed, 0 for an arrow's implicit `return` */
		this.stack = [];
		/** @type {boolean} */
		this.strict = Boolean(options.module);
		/** @type {Map<string, MinifierLabel>} */
		this.labelsInScope = new Map();
		/** @type {MinifierLabel | null} */
		this.currentLabel = null;
		/** @type {number} the pattern the walk is inside, 0 for none */
		this.inDestructuring = 0;
		/** @type {Set<string> | null} the names the `with` body visited spells, while one is */
		this.namesInWith = null;
		/** @type {boolean} whether the names a `with` body spells are collected, to mangle the rest */
		this.collectsWithNames = Boolean(options.withNames);
		/** @type {boolean} whether the name visited is an assignment's or a loop's target */
		this.assigning = false;
		// Filled in place: `Array.from` takes four times as long on a large tree.
		/** @type {TreeDefinition[]} */
		// eslint-disable-next-line unicorn/no-new-array
		this.definitions = new Array(types.length).fill(null);
		/** @type {number[] | null} each name with one spelled beside it */
		this.spelledIdentifiers = options.spelledNames ? [] : null;
		/** @type {string[]} the name spelled beside each */
		this.spellings = [];
		/** @type {number[]} the characters each pair saves */
		this.spelledSavings = [];
		/** @type {boolean} whether a key spells a name, which prints alone where it is its value's */
		this.spelledKeys = options.spelledNames === SPELLED_KEYS;
	}

	/**
	 * Collects a name and one spelled beside it, under `spelledNames`.
	 * @param {number} identifier the name, 0 for none
	 * @param {number} spelled what spells the other, 0 for none
	 * @param {number} saving the characters it saves taking that name
	 * @returns {void}
	 */
	_spell(identifier, spelled, saving) {
		const identifiers = this.spelledIdentifiers;
		const { types, tree } = this;
		if (
			identifiers === null ||
			identifier === 0 ||
			spelled === 0 ||
			types[identifier] !== NodeType.Identifier
		) {
			return;
		}
		/** @type {ReturnType<SyntaxTree["value"]>} */
		let spelling;
		if (types[spelled] === NodeType.Identifier) {
			spelling = tree.name(spelled);
		} else if (types[spelled] === NodeType.Literal) {
			spelling = tree.value(spelled);
		}
		if (
			typeof spelling !== "string" ||
			!SPELLABLE_NAME.test(spelling) ||
			NAMES_NO_BINDING_TAKES.has(spelling) ||
			// A shorthand `__proto__` is an own property; `__proto__:` sets the prototype.
			spelling === "__proto__"
		) {
			return;
		}
		identifiers.push(identifier);
		this.spellings.push(spelling);
		this.spelledSavings.push(saving);
	}

	/**
	 * Collects a property's value named as its key could be, under `spelledNames`.
	 * @param {number} property a property of an object or a pattern
	 * @returns {void}
	 */
	_spellProperty(property) {
		const { tree } = this;
		if (!this.spelledKeys || tree.flag(Flag.computed, property)) {
			return;
		}
		const value = tree.field(0, Field.value, property);
		this._spell(
			this.types[value] === NodeType.AssignmentPattern
				? tree.field(0, Field.left, value)
				: value,
			tree.field(0, Field.key, property),
			SHORTHAND_SAVING
		);
	}

	/**
	 * @returns {SpelledNames | null} the names collected under `spelledNames`, resolved
	 */
	_spelledNames() {
		const identifiers = this.spelledIdentifiers;
		if (identifiers === null) return null;
		return {
			identifiers: this._asNames(identifiers),
			spellings: this.spellings,
			savings: this.spelledSavings
		};
	}

	/**
	 * @param {number} field the `Field`
	 * @param {number} node a node
	 * @param {number=} i the item's index, for a list
	 * @returns {number} the node the field holds, past parentheses, 0 for none
	 */
	_child(field, node, i = 0) {
		const { tree } = this;
		let child = tree.field(i, field, node);
		while (
			child !== 0 &&
			tree.type(child) === NodeType.ParenthesizedExpression
		) {
			child = tree.field(0, Field.expression, child);
		}
		return child;
	}

	/**
	 * @param {number} field the `Field`, a list
	 * @param {number} node a node
	 * @returns {void}
	 */
	_visitList(field, node) {
		const count = this.tree.fieldCount(field, node);
		for (let i = 0; i < count; i++) {
			const child = this._child(field, node, i);
			if (child !== 0) this._visit(child);
		}
	}

	/**
	 * @param {number} field the `Field`
	 * @param {number} node a node
	 * @returns {void}
	 */
	_visitChild(field, node) {
		const child = this._child(field, node);
		if (child !== 0) this._visit(child);
	}

	/**
	 * @param {number} node a node
	 * @returns {string} the name it is, a quoted module name's among them
	 */
	_nameOf(node) {
		const { tree } = this;
		return tree.type(node) === NodeType.Literal
			? String(tree.value(node))
			: tree.name(node);
	}

	/**
	 * @param {ScopeType} type what opens it
	 * @param {number} node the node opening it
	 * @param {boolean} isVarScope whether `var` hoists to here
	 * @returns {MinifierScope} the scope, now current
	 */
	_open(type, node, isVarScope) {
		const scope = new MinifierScope(type, node, this.scope, isVarScope);
		this.scope = scope;
		return scope;
	}

	/**
	 * @param {ScopeType} type what opens it
	 * @param {number} node a block's node
	 * @returns {MinifierScope} the scope it leaves
	 */
	_enterBlock(type, node) {
		const outer = this.scope;
		const scope = this._open(type, node, false);
		scope.usesWith = outer.usesWith;
		scope.withNames = outer.withNames;
		return outer;
	}

	/**
	 * Visits a `with` body, collecting the names it reads, writes and declares.
	 * @param {() => void} visit visits the body
	 * @returns {void}
	 */
	_visitWithBody(visit) {
		const from = this.scope;
		reachByWith(from, this.collectsWithNames);
		if (!this.collectsWithNames) {
			visit();
			return;
		}
		const outer = this.namesInWith;
		/** @type {Set<string>} */
		const names = new Set();
		this.namesInWith = names;
		const { referenceNodes } = this;
		const first = referenceNodes.length;
		visit();
		for (let i = first; i < referenceNodes.length; i++) {
			names.add(this.tree.name(referenceNodes[i]));
		}
		this.namesInWith = outer;
		if (outer !== null) for (const name of names) outer.add(name);
		keepWithNames(from, names);
	}

	/**
	 * terser's `def_variable`.
	 * @param {MinifierScope} target the scope declaring it
	 * @param {number} identifier the name declaring it, 0 for none written
	 * @param {string} name the name
	 * @param {number} kind how it is declared
	 * @returns {MinifierVariable} its definition, made or joined
	 */
	_defineVariable(target, identifier, name, kind) {
		if (this.namesInWith !== null) this.namesInWith.add(name);
		let variable = /** @type {MinifierVariable | undefined} */ (
			target.getBinding(name)
		);
		if (variable !== undefined) {
			variable.declarations |= 1 << kind;
			// A second declaration may set it again.
			variable.written = true;
		} else {
			variable = new MinifierVariable(name, target, kind);
			variable.global = target.upper === null;
			addBinding(target, variable);
		}
		if (identifier !== 0) this.definitions[identifier] = variable;
		return variable;
	}

	/**
	 * @param {MinifierScope} from the scope reading it
	 * @param {MinifierVariable} variable what it reads
	 * @returns {void}
	 */
	_referenceVariable(from, variable) {
		variable.referenceCount++;
		encloseVariable(from, variable);
	}

	/**
	 * terser's `mark_export`, counting levels on the walk's stack.
	 * @param {MinifierVariable} variable a definition just made
	 * @param {number} level where its declaration's statement is
	 * @returns {void}
	 */
	_markExport(variable, level) {
		const { stack } = this;
		if (this.inDestructuring !== 0) {
			let i = 0;
			do {
				level++;
			} while (stack[stack.length - 1 - i++] !== this.inDestructuring);
		}
		const node = stack[stack.length - 1 - level];
		const type = node === undefined ? 0 : this.types[node];
		if (
			type !== NodeType.ExportNamedDeclaration &&
			type !== NodeType.ExportDefaultDeclaration &&
			type !== NodeType.ExportAllDeclaration
		) {
			variable.export = 0;
			return;
		}
		variable.export =
			type === NodeType.ExportDefaultDeclaration && !this._exportsValue(node)
				? EXPORT_WANT_MANGLE
				: EXPORT_KEEP_NAME;
	}

	/**
	 * @param {number} node an `export default`
	 * @returns {boolean} whether terser holds what it exports as a value, not a named declaration
	 */
	_exportsValue(node) {
		const declaration = this.tree.field(0, Field.declaration, node);
		const type = this.tree.type(declaration);
		return (
			(type !== NodeType.FunctionDeclaration &&
				type !== NodeType.ClassDeclaration) ||
			this.tree.field(0, Field.id, declaration) === 0
		);
	}

	/**
	 * @param {number} node an import or export
	 * @param {string} type terser's name for it
	 * @returns {void}
	 */
	_checkModuleStatement(node, type) {
		if (this.scope !== this.toplevel) {
			this.raise(node, `"${type}" statement may only appear at the top level`);
		}
	}

	/**
	 * @param {number} node a name read, or a re-exported string
	 * @param {number} flags what else is known of it, as `REFERENCE_*` bits
	 * @returns {void}
	 */
	_addReference(node, flags) {
		this.referenceNodes.push(node);
		this.referenceScopes.push(this.scope);
		this.referenceFlags.push(flags);
	}

	/**
	 * A name a declaration or a pattern binds, or reads where `kind` is 0.
	 * @param {number} node the name or pattern
	 * @param {number} kind how it declares, as a `DECLARES_*` code, or 0
	 * @returns {void}
	 */
	_visitBinding(node, kind) {
		const { stack } = this;
		switch (this.types[node]) {
			case NodeType.Identifier:
				if (kind === 0) {
					this.assigning = true;
					this._visit(node);
					this.assigning = false;
				} else {
					this._declare(node, kind);
				}
				return;
			case NodeType.ObjectPattern:
				this._visitPattern(node, Field.properties, kind);
				return;
			case NodeType.ArrayPattern:
				this._visitPattern(node, Field.elements, kind);
				return;
			case NodeType.AssignmentPattern:
				stack.push(node);
				this._visitBinding(this._child(Field.left, node), kind);
				this._visit(this._child(Field.right, node));
				stack.pop();
				return;
			case NodeType.RestElement:
				stack.push(node);
				this._visitBinding(this._child(Field.argument, node), kind);
				stack.pop();
				return;
			default:
				this._visit(node);
		}
	}

	/**
	 * @param {number} pattern an object or array pattern
	 * @param {number} field its properties or elements
	 * @param {number} kind how it declares, as a `DECLARES_*` code, or 0
	 * @returns {void}
	 */
	_visitPattern(pattern, field, kind) {
		const { stack, tree } = this;
		const outer = this.inDestructuring;
		this.inDestructuring = pattern;
		stack.push(pattern);
		const count = tree.fieldCount(field, pattern);
		for (let i = 0; i < count; i++) {
			const element = this._child(field, pattern, i);
			if (element === 0) continue;
			if (this.types[element] !== NodeType.Property) {
				this._visitBinding(element, kind);
				continue;
			}
			stack.push(element);
			if (tree.flag(Flag.computed, element)) {
				this._visitChild(Field.key, element);
			}
			this._visitBinding(this._child(Field.value, element), kind);
			this._spellProperty(element);
			stack.pop();
		}
		stack.pop();
		this.inDestructuring = outer;
	}

	/**
	 * A `var`, parameter, `let`, `const`, `using`, catch parameter or import.
	 * @param {number} identifier the name declared
	 * @param {number} kind how, as a `DECLARES_*` code
	 * @returns {void}
	 */
	_declare(identifier, kind) {
		const name = this.tree.name(identifier);
		const { scope } = this;
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
		// A redeclaration terser refuses here the tree's parser refused first.
		const variable = this._defineVariable(
			blockDeclaration ? scope : defun,
			identifier,
			name,
			kind
		);
		if (kind !== DECLARES_FUNARG) this._markExport(variable, 2);
		if (defun !== scope) {
			encloseVariable(scope, variable);
			const found = /** @type {MinifierVariable} */ (
				findMinifierVariable(scope, name)
			);
			if (found !== variable) {
				this.definitions[identifier] = found;
				this._referenceVariable(scope, found);
				this._recordCatchRead(identifier, scope, found);
			}
		}
		if (kind === DECLARES_CATCH) {
			this._addReference(identifier, REFERENCE_CATCH);
			if (this.catchReads !== null) {
				if (!this.catchReads.has(variable)) {
					this.catchReads.set(variable, { nodes: [], scopes: [] });
				}
				this.catchNames.push(identifier);
				this.catchScopes.push(scope);
			} else {
				this.catchParameters.push(identifier);
			}
		}
	}

	/**
	 * Under `ie8` or `safari10`, records a name resolved to a catch parameter,
	 * which `_moveCatchParameters` moves to the function's definition.
	 * @param {number} node the name
	 * @param {MinifierScope} from the scope reading it
	 * @param {MinifierVariable} variable what it resolved to
	 * @returns {void}
	 */
	_recordCatchRead(node, from, variable) {
		if (this.catchReads === null) return;
		const reads = this.catchReads.get(variable);
		if (reads === undefined) return;
		reads.nodes.push(node);
		reads.scopes.push(from);
	}

	/**
	 * @param {number} node a binding pattern, 0 for an array's hole
	 * @param {string} name a name
	 * @returns {boolean} whether the pattern binds the name
	 */
	_bindsName(node, name) {
		if (node === 0) return false;
		const { tree } = this;
		switch (this.types[node]) {
			case NodeType.ObjectPattern:
				return this._someChild(Field.properties, node, (property) =>
					this._bindsName(
						this.types[property] === NodeType.Property
							? this._child(Field.value, property)
							: property,
						name
					)
				);
			case NodeType.ArrayPattern:
				return this._someChild(Field.elements, node, (element) =>
					this._bindsName(element, name)
				);
			case NodeType.AssignmentPattern:
				return this._bindsName(this._child(Field.left, node), name);
			case NodeType.RestElement:
				return this._bindsName(this._child(Field.argument, node), name);
			default:
				return tree.name(node) === name;
		}
	}

	/**
	 * @param {number} field the `Field`, a list
	 * @param {number} node a node
	 * @param {(child: number) => boolean} test what a child is asked
	 * @returns {boolean} whether it holds for a child, holes 0
	 */
	_someChild(field, node, test) {
		const count = this.tree.fieldCount(field, node);
		for (let i = 0; i < count; i++) {
			if (test(this._child(field, node, i))) return true;
		}
		return false;
	}

	/**
	 * @param {number} node a statement, or a loop's head, 0 for none
	 * @param {string} name a name
	 * @returns {boolean} whether it declares the name with `let`, `const`, `using` or a class
	 */
	_declaresLexically(node, name) {
		if (node === 0) return false;
		const { tree } = this;
		const type = this.types[node];
		if (type === NodeType.VariableDeclaration) {
			return (
				tree.textOf(Part.kind, node) !== "var" &&
				this._someChild(Field.declarations, node, (declarator) =>
					this._bindsName(tree.field(0, Field.id, declarator), name)
				)
			);
		}
		return (
			type === NodeType.ClassDeclaration &&
			tree.name(tree.field(0, Field.id, node)) === name
		);
	}

	/**
	 * @param {number} owner a node listing statements
	 * @param {number} field the `Field` listing them
	 * @param {string} name a name
	 * @returns {boolean} whether one of them declares it lexically
	 */
	_listDeclaresLexically(owner, field, name) {
		const count = this.tree.fieldCount(field, owner);
		for (let i = 0; i < count; i++) {
			if (this._declaresLexically(this.tree.field(i, field, owner), name)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Annex B's test for a sloppy block's function: a `var` of its name would be
	 * an early error, which keeps the function in its block.
	 * @param {MinifierScope} scope the scope the function is declared in
	 * @param {string} name the function's name
	 * @returns {boolean} true for `f` in `{ let f; { function f() {} } }`
	 */
	_keepsInBlock(scope, name) {
		const { tree } = this;
		while (scope !== scope.variableScope) {
			const { node } = scope;
			switch (this.types[node]) {
				case NodeType.BlockStatement:
					if (this._listDeclaresLexically(node, Field.body, name)) return true;
					break;
				case NodeType.SwitchStatement: {
					const count = tree.fieldCount(Field.cases, node);
					for (let i = 0; i < count; i++) {
						const branch = tree.field(i, Field.cases, node);
						if (this._listDeclaresLexically(branch, Field.consequent, name)) {
							return true;
						}
					}
					break;
				}
				case NodeType.ForStatement:
					if (this._declaresLexically(this._child(Field.init, node), name)) {
						return true;
					}
					break;
				case NodeType.ForInStatement:
				case NodeType.ForOfStatement:
					if (this._declaresLexically(this._child(Field.left, node), name)) {
						return true;
					}
					break;
				case NodeType.CatchClause: {
					const param = tree.field(0, Field.param, node);
					if (
						(param !== 0 &&
							this.types[param] !== NodeType.Identifier &&
							this._bindsName(param, name)) ||
						this._listDeclaresLexically(
							tree.field(0, Field.body, node),
							Field.body,
							name
						)
					) {
						return true;
					}
					break;
				}
			}
			scope = /** @type {MinifierScope} */ (scope.upper);
		}
		const { node } = scope;
		if (this.types[node] === NodeType.Program) {
			return this._listDeclaresLexically(node, Field.body, name);
		}
		// A function holding a statement has a block for its body.
		return (
			this._someChild(Field.params, node, (param) =>
				this._bindsName(param, name)
			) ||
			this._listDeclaresLexically(
				this._child(Field.body, node),
				Field.body,
				name
			)
		);
	}

	/**
	 * @param {number} node a function
	 * @returns {void}
	 */
	_visitFunction(node) {
		const { stack, tree } = this;
		const outerStrict = this.strict;
		const outer = this.scope;
		const outerLabels = this.labelsInScope;
		const type = this.types[node];
		const parentType = this.types[stack[stack.length - 1]];
		const inBlock =
			type === NodeType.FunctionDeclaration &&
			parentType !== NodeType.Program &&
			parentType !== NodeType.FunctionDeclaration &&
			parentType !== NodeType.FunctionExpression &&
			parentType !== NodeType.ArrowFunctionExpression &&
			parentType !== NodeType.StaticBlock;
		if (inBlock) {
			this.blockDefunScopes.add(
				/** @type {MinifierScope} */ (outer.variableScope)
			);
		}
		stack.push(node);
		const lambda = this._open("function", node, true);
		if (type !== NodeType.ArrowFunctionExpression) {
			this._defineVariable(lambda, 0, "arguments", DECLARES_FUNARG);
		}
		this.labelsInScope = new Map();
		const id = tree.field(0, Field.id, node);
		if (id === 0) {
			// An arrow or a method has no name of its own.
		} else if (type === NodeType.FunctionDeclaration) {
			const name = tree.name(id);
			this._markExport(
				this._defineVariable(
					// Annex B hoists a sloppy block's plain function only.
					this.strict ||
						(this.parameterScopes &&
							(tree.flag(Flag.async, node) ||
								tree.flag(Flag.generator, node) ||
								(inBlock && this._keepsInBlock(outer, name))))
						? outer
						: /** @type {MinifierScope} */ (outer.variableScope),
					id,
					name,
					DECLARES_DEFUN
				),
				1
			);
		} else {
			this._defineVariable(lambda, id, tree.name(id), DECLARES_LAMBDA);
			lambda.functionName = /** @type {MinifierVariable} */ (
				this.definitions[id]
			);
		}
		const params = tree.fieldCount(Field.params, node);
		const ranged = this.parameterScopes && params !== 0;
		if (ranged) {
			lambda.parameterStart = this.referenceNodes.length;
			this.parameterRanges.push(lambda);
		}
		for (let i = 0; i < params; i++) {
			this._visitBinding(this._child(Field.params, node, i), DECLARES_FUNARG);
		}
		if (ranged) lambda.parameterEnd = this.referenceNodes.length;
		const body = this._child(Field.body, node);
		if (this.types[body] === NodeType.BlockStatement) {
			this._visitList(Field.body, body);
		} else {
			// terser's arrow returns its expression from a statement of its own.
			stack.push(0);
			this._visit(body);
			stack.pop();
		}
		this.scope = outer;
		this.labelsInScope = outerLabels;
		this.strict = outerStrict;
		stack.pop();
	}

	/**
	 * @param {number} node a class
	 * @returns {void}
	 */
	_visitClass(node) {
		const { tree } = this;
		const outerStrict = this.strict;
		const outer = this.scope;
		const outerLabels = this.labelsInScope;
		this.stack.push(node);
		this.strict = true;
		const classScope = this._open("class", node, true);
		this.labelsInScope = new Map();
		const id = tree.field(0, Field.id, node);
		if (id !== 0) {
			const name = tree.name(id);
			this._markExport(
				this.types[node] === NodeType.ClassDeclaration
					? this._defineVariable(outer, id, name, DECLARES_DEF_CLASS)
					: this._defineVariable(classScope, id, name, DECLARES_CLASS),
				1
			);
		}
		this._visitChild(Field.superClass, node);
		this._visitList(Field.body, tree.field(0, Field.body, node));
		this.scope = outer;
		this.labelsInScope = outerLabels;
		this.strict = outerStrict;
		this.stack.pop();
	}

	/**
	 * @param {number} node a `var`, `let`, `const` or `using`
	 * @returns {void}
	 */
	_visitDeclaration(node) {
		const { stack, tree, functionDeclarators, classDeclarators } = this;
		const text = tree.textOf(Part.kind, node);
		const kind =
			text === "var"
				? DECLARES_VAR
				: text === "let"
					? DECLARES_LET
					: text === "const"
						? DECLARES_CONST
						: DECLARES_USING;
		stack.push(node);
		const count = tree.fieldCount(Field.declarations, node);
		for (let i = 0; i < count; i++) {
			const declarator = tree.field(i, Field.declarations, node);
			const id = tree.field(0, Field.id, declarator);
			const init = this._child(Field.init, declarator);
			if (
				functionDeclarators !== null &&
				kind !== DECLARES_USING &&
				this.types[id] === NodeType.Identifier &&
				init !== 0 &&
				(this.types[init] === NodeType.FunctionExpression ||
					this.types[init] === NodeType.ArrowFunctionExpression) &&
				tree.field(0, Field.id, init) === 0
			) {
				functionDeclarators.push(id);
			} else if (
				classDeclarators !== null &&
				kind !== DECLARES_USING &&
				this.types[id] === NodeType.Identifier &&
				init !== 0 &&
				this.types[init] === NodeType.ClassExpression &&
				tree.field(0, Field.id, init) === 0
			) {
				classDeclarators.push(id);
			}
			if (
				this.aliasDeclarators !== null &&
				(kind === DECLARES_LET || kind === DECLARES_CONST) &&
				this.types[id] === NodeType.Identifier &&
				init !== 0 &&
				this.types[init] === NodeType.Identifier
			) {
				this.aliasDeclarators.push(declarator);
			} else if (
				this.functionBindings !== null &&
				kind !== DECLARES_USING &&
				/** @type {Uint8Array} */ (listsStatements)[
					this.types[stack[stack.length - 2]]
				] === 1 &&
				this.types[id] === NodeType.Identifier &&
				init !== 0 &&
				(this.types[init] === NodeType.FunctionExpression ||
					this.types[init] === NodeType.ArrowFunctionExpression)
			) {
				const list = stack[stack.length - 2];
				this.functionBindings.push(
					declarator,
					tree.start(list),
					tree.end(list)
				);
			}
			stack.push(declarator);
			this._visitBinding(id, kind);
			if (init !== 0) this._visit(init);
			stack.pop();
		}
		stack.pop();
	}

	/**
	 * A loop's children, its scope entered.
	 * @param {number} node the loop
	 * @returns {void}
	 */
	_visitLoop(node) {
		switch (this.types[node]) {
			case NodeType.ForStatement:
				this._visitChild(Field.init, node);
				this._visitChild(Field.test, node);
				this._visitChild(Field.update, node);
				break;
			case NodeType.WhileStatement:
				this._visitChild(Field.test, node);
				break;
			case NodeType.DoWhileStatement:
				this._visitChild(Field.body, node);
				this._visitChild(Field.test, node);
				return;
			default:
				this._visitBinding(this._child(Field.left, node), 0);
				this._visitChild(Field.right, node);
		}
		this._visitChild(Field.body, node);
	}

	/**
	 * Reads one node as `MinifierScopeAnalyzer#_visitPrint` reads terser's.
	 * @param {number} node node to visit
	 * @returns {void}
	 */
	_visit(node) {
		const { stack, tree } = this;
		const type = this.types[node];
		switch (type) {
			case NodeType.Identifier: {
				// A number too large for a double, which terser holds as an atom.
				if (tree.type(node) !== NodeType.Identifier) return;
				const parent = stack[stack.length - 1];
				const parentType = this.types[parent];
				this._addReference(
					node,
					tree.name(node) === "eval" &&
						(parentType === NodeType.CallExpression ||
							parentType === NodeType.NewExpression)
						? REFERENCE_CALLED
						: this.assigning ||
							  parentType === NodeType.UpdateExpression ||
							  (parentType === NodeType.AssignmentExpression &&
									this._child(Field.left, parent) === node)
							? REFERENCE_WRITTEN
							: parentType === NodeType.Property &&
								  tree.flag(Flag.shorthand, parent)
								? REFERENCE_SHORTHAND
								: parentType === NodeType.CallExpression &&
									  this._child(Field.callee, parent) === node
									? REFERENCE_CALLEE
									: 0
				);
				return;
			}
			case NodeType.MemberExpression: {
				stack.push(node);
				this._visitChild(Field.object, node);
				const property = this._child(Field.property, node);
				if (tree.flag(Flag.computed, node)) {
					this._visit(property);
				} else if (tree.type(property) === NodeType.PrivateIdentifier) {
					this.namesPrivate = true;
				}
				stack.pop();
				return;
			}
			case NodeType.CallExpression:
			case NodeType.NewExpression:
				// terser's walk reaches the arguments first.
				stack.push(node);
				this._visitList(Field.arguments, node);
				this._visitChild(Field.callee, node);
				stack.pop();
				return;
			case NodeType.Literal:
			case NodeType.ThisExpression:
				return;
			case NodeType.ExpressionStatement: {
				const directive = tree.textOf(Part.directive, node);
				if (directive !== null) {
					if (directive === "use strict") this.strict = true;
					return;
				}
				stack.push(node);
				this._visitChild(Field.expression, node);
				stack.pop();
				return;
			}
			case NodeType.BinaryExpression:
			case NodeType.LogicalExpression:
			case NodeType.AssignmentExpression:
				stack.push(node);
				this._visitChild(Field.left, node);
				this._visitChild(Field.right, node);
				stack.pop();
				return;
			case NodeType.BlockStatement: {
				stack.push(node);
				const outer = this._enterBlock("block", node);
				this._visitList(Field.body, node);
				this.scope = outer;
				stack.pop();
				return;
			}
			case NodeType.ReturnStatement:
			case NodeType.UnaryExpression:
			case NodeType.UpdateExpression:
			case NodeType.ThrowStatement:
			case NodeType.AwaitExpression:
			case NodeType.SpreadElement:
			case NodeType.YieldExpression:
				stack.push(node);
				this._visitChild(Field.argument, node);
				stack.pop();
				return;
			case NodeType.VariableDeclaration:
				this._visitDeclaration(node);
				return;
			case NodeType.FunctionDeclaration:
			case NodeType.FunctionExpression:
			case NodeType.ArrowFunctionExpression: {
				const parent = stack[stack.length - 1];
				if (
					type === NodeType.FunctionDeclaration &&
					this.functionBindings !== null &&
					/** @type {Uint8Array} */ (listsStatements)[this.types[parent]] ===
						1 &&
					this.types[parent] !== NodeType.BlockStatement &&
					this.types[parent] !== NodeType.SwitchCase &&
					this.types[parent] !== NodeType.StaticBlock
				) {
					// Hoisted, it is made as its function or the program starts.
					this.functionBindings.push(
						node,
						tree.start(parent),
						tree.start(parent)
					);
				}
				this._visitFunction(node);
				return;
			}
			case NodeType.ClassDeclaration:
			case NodeType.ClassExpression:
				this._visitClass(node);
				return;
			case NodeType.ForStatement:
			case NodeType.ForInStatement:
			case NodeType.ForOfStatement:
			case NodeType.WhileStatement:
			case NodeType.DoWhileStatement: {
				if (this.loopRanges !== null) {
					this.loopRanges.push(tree.start(node), tree.end(node));
				}
				stack.push(node);
				const outer = this._enterBlock(
					type === NodeType.WhileStatement || type === NodeType.DoWhileStatement
						? "block"
						: "for",
					node
				);
				if (
					this.safari10 &&
					type !== NodeType.WhileStatement &&
					type !== NodeType.DoWhileStatement
				) {
					this.forScopes.push(this.scope);
				}
				this._visitLoop(node);
				this.scope = outer;
				stack.pop();
				return;
			}
			case NodeType.SwitchStatement: {
				stack.push(node);
				const outer = this._enterBlock("switch", node);
				// The switched expression belongs to the scope around the switch.
				const block = this.scope;
				this.scope = outer;
				this._visitChild(Field.discriminant, node);
				this.scope = block;
				this._visitList(Field.cases, node);
				this.scope = outer;
				stack.pop();
				return;
			}
			case NodeType.CatchClause: {
				stack.push(node);
				const outer = this._enterBlock("catch", node);
				const catchScope = this.scope;
				const param = tree.field(0, Field.param, node);
				const ranged = this.parameterScopes && param !== 0;
				if (ranged) {
					catchScope.parameterStart = this.referenceNodes.length;
					this.parameterRanges.push(catchScope);
				}
				if (param !== 0) this._visitBinding(param, DECLARES_CATCH);
				if (ranged) catchScope.parameterEnd = this.referenceNodes.length;
				this._visitList(Field.body, tree.field(0, Field.body, node));
				this.scope = outer;
				stack.pop();
				return;
			}
			case NodeType.StaticBlock: {
				const outer = this.scope;
				const outerLabels = this.labelsInScope;
				stack.push(node);
				this._open("class-static-block", node, true);
				this.labelsInScope = new Map();
				this._visitList(Field.body, node);
				this.scope = outer;
				this.labelsInScope = outerLabels;
				stack.pop();
				return;
			}
			case NodeType.LabeledStatement: {
				// The tree's parser refuses a label defined twice or undefined.
				const labelName = tree.field(0, Field.label, node);
				const name = tree.name(labelName);
				const label = new MinifierLabel(name, this.currentLabel);
				this.labels.push(label);
				this.definitions[labelName] = label;
				this.labelsInScope.set(name, label);
				stack.push(node);
				this.currentLabel = label;
				this._visitChild(Field.body, node);
				this.currentLabel = label.parent;
				stack.pop();
				this.labelsInScope.delete(name);
				return;
			}
			case NodeType.BreakStatement:
			case NodeType.ContinueStatement: {
				const labelName = tree.field(0, Field.label, node);
				if (labelName === 0) return;
				this.definitions[labelName] = /** @type {MinifierLabel} */ (
					this.labelsInScope.get(tree.name(labelName))
				);
				return;
			}
			case NodeType.WithStatement:
				stack.push(node);
				this._visitChild(Field.object, node);
				this._visitWithBody(() => this._visitChild(Field.body, node));
				stack.pop();
				return;
			case NodeType.Property:
			case NodeType.PropertyDefinition:
				if (
					tree.type(tree.field(0, Field.key, node)) ===
					NodeType.PrivateIdentifier
				) {
					this.namesPrivate = true;
				}
				stack.push(node);
				if (tree.flag(Flag.computed, node)) this._visitChild(Field.key, node);
				this._visitChild(Field.value, node);
				if (
					this.types[node] === NodeType.Property &&
					tree.textOf(Part.kind, node) === "init" &&
					!tree.flag(Flag.method, node)
				) {
					this._spellProperty(node);
				}
				stack.pop();
				return;
			case NodeType.ObjectPattern:
			case NodeType.ArrayPattern:
			case NodeType.AssignmentPattern:
			case NodeType.RestElement:
				this._visitBinding(node, 0);
				return;
			case NodeType.TemplateLiteral:
				// Its strings, between the expressions, read nothing.
				stack.push(node);
				this._visitList(Field.expressions, node);
				stack.pop();
				return;
			case NodeType.ImportExpression:
				stack.push(node);
				this._visitChild(Field.source, node);
				this._visitChild(Field.options, node);
				stack.pop();
				return;
			case NodeType.MethodDefinition:
				if (
					tree.type(tree.field(0, Field.key, node)) ===
					NodeType.PrivateIdentifier
				) {
					this.namesPrivate = true;
				}
				stack.push(node);
				if (tree.flag(Flag.computed, node)) this._visitChild(Field.key, node);
				this._visitChild(Field.value, node);
				stack.pop();
				return;
			case NodeType.IfStatement:
			case NodeType.ConditionalExpression:
				stack.push(node);
				this._visitChild(Field.test, node);
				this._visitChild(Field.consequent, node);
				this._visitChild(Field.alternate, node);
				stack.pop();
				return;
			case NodeType.SwitchCase:
				stack.push(node);
				this._visitChild(Field.test, node);
				this._visitList(Field.consequent, node);
				stack.pop();
				return;
			case NodeType.ArrayExpression:
				stack.push(node);
				this._visitList(Field.elements, node);
				stack.pop();
				return;
			case NodeType.ObjectExpression:
				stack.push(node);
				this._visitList(Field.properties, node);
				stack.pop();
				return;
			case NodeType.SequenceExpression:
				stack.push(node);
				this._visitList(Field.expressions, node);
				stack.pop();
				return;
			case NodeType.TaggedTemplateExpression:
				stack.push(node);
				this._visitChild(Field.tag, node);
				this._visitChild(Field.quasi, node);
				stack.pop();
				return;
			case NodeType.ChainExpression:
				stack.push(node);
				this._visitChild(Field.expression, node);
				stack.pop();
				return;
			case NodeType.TryStatement:
				stack.push(node);
				this._visitChild(Field.block, node);
				this._visitChild(Field.handler, node);
				this._visitChild(Field.finalizer, node);
				stack.pop();
				return;
			case NodeType.PrivateIdentifier:
				this.namesPrivate = true;
				return;
			case NodeType.ImportDeclaration: {
				this._checkModuleStatement(node, "Import");
				stack.push(node);
				const count = tree.fieldCount(Field.specifiers, node);
				for (let i = 0; i < count; i++) {
					const specifier = tree.field(i, Field.specifiers, node);
					const local = tree.field(0, Field.local, specifier);
					// terser holds a default import's name with no node around it.
					if (this.types[specifier] === NodeType.ImportDefaultSpecifier) {
						this._declare(local, DECLARES_IMPORT);
						continue;
					}
					stack.push(specifier);
					this._declare(local, DECLARES_IMPORT);
					if (this.types[specifier] === NodeType.ImportSpecifier) {
						this._spell(
							local,
							tree.field(0, Field.imported, specifier),
							AS_SAVING
						);
					}
					stack.pop();
				}
				stack.pop();
				return;
			}
			case NodeType.ExportNamedDeclaration: {
				this._checkModuleStatement(node, "Export");
				stack.push(node);
				this._visitChild(Field.declaration, node);
				const flags =
					tree.field(0, Field.source, node) !== 0
						? REFERENCE_EXPORTED | REFERENCE_FROM_MODULE
						: REFERENCE_EXPORTED;
				const count = tree.fieldCount(Field.specifiers, node);
				for (let i = 0; i < count; i++) {
					const specifier = tree.field(i, Field.specifiers, node);
					stack.push(specifier);
					const local = tree.field(0, Field.local, specifier);
					this._addReference(local, flags);
					if ((flags & REFERENCE_FROM_MODULE) === 0) {
						this._spell(
							local,
							tree.field(0, Field.exported, specifier),
							AS_SAVING
						);
					}
					stack.pop();
				}
				stack.pop();
				return;
			}
			case NodeType.ExportDefaultDeclaration:
				this._checkModuleStatement(node, "Export");
				stack.push(node);
				this._visitChild(Field.declaration, node);
				stack.pop();
				return;
			case NodeType.ExportAllDeclaration:
				// terser's `*` reads a global no name in the output depends on.
				this._checkModuleStatement(node, "Export");
				return;
			case NodeType.Super:
			case NodeType.EmptyStatement:
			case NodeType.DebuggerStatement:
			case NodeType.MetaProperty:
				return;
			default:
				throw new Error(
					`The minifier's scope analysis cannot read a node of type ${type}`
				);
		}
	}

	/**
	 * Resolves each name read, finds `eval`, and encloses what a catch
	 * parameter redefines.
	 * @returns {void}
	 */
	_resolve() {
		const { referenceNodes, referenceScopes, referenceFlags, globals, tree } =
			this;
		for (let i = 0; i < referenceNodes.length; i++) {
			const node = referenceNodes[i];
			const from = referenceScopes[i];
			const flags = referenceFlags[i];
			if (flags & REFERENCE_CATCH) {
				const redefinition = /** @type {MinifierVariable | undefined} */ (
					from.variableScope.getBinding(tree.name(node))
				);
				if (redefinition !== undefined) encloseVariable(from, redefinition);
				continue;
			}
			const name = this._nameOf(node);
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
			if (tree.type(node) === NodeType.Identifier) {
				if (flags & REFERENCE_WRITTEN) variable.written = true;
				this.definitions[node] = variable;
				this._referenceVariable(from, variable);
				this._recordCatchRead(node, from, variable);
			} else {
				// A re-exported string reads a global, which keeps no references.
				encloseVariable(from, variable);
			}
		}
		const { parameterRanges } = this;
		for (let i = 0; i < parameterRanges.length; i++) {
			parameterRanges[i].parameterStart = -1;
			parameterRanges[i].parameterEnd = -1;
		}
		if (this.catchReads !== null) this._moveCatchParameters();
		// terser's pass 4, up to the function: a block around the loop that the
		// one pass prints without braces leaves the loop in the scope outside.
		const { forScopes } = this;
		for (let i = 0; i < forScopes.length; i++) {
			const forScope = forScopes[i];
			let outer = /** @type {MinifierScope} */ (forScope.upper);
			for (;;) {
				const { variables } = outer;
				for (let j = 0; j < variables.length; j++) {
					encloseUnique(
						forScope,
						/** @type {MinifierVariable} */ (variables[j])
					);
				}
				if (outer === forScope.variableScope) break;
				outer = /** @type {MinifierScope} */ (outer.upper);
			}
		}
	}

	/**
	 * terser's pass 3 under `ie8` or `safari10`: each catch parameter, and every
	 * name resolved to it, is its function's definition of the name, which the
	 * parameter writes, so the mangler names the two alike.
	 * @returns {void}
	 */
	_moveCatchParameters() {
		const { catchNames, catchScopes, definitions, globals, tree } = this;
		const catchReads =
			/** @type {Map<MinifierVariable, { nodes: number[], scopes: MinifierScope[] }>} */ (
				this.catchReads
			);
		for (let i = 0; i < catchNames.length; i++) {
			const identifier = catchNames[i];
			const name = tree.name(identifier);
			const defunScope = /** @type {MinifierScope} */ (
				catchScopes[i].variableScope
			);
			const variable =
				findMinifierVariable(defunScope, name) ||
				globals.get(name) ||
				this._defineVariable(defunScope, 0, name, DECLARES_CATCH);
			variable.written = true;
			const reads = catchReads.get(
				/** @type {MinifierVariable} */ (definitions[identifier])
			);
			if (reads !== undefined) {
				const { nodes, scopes } = reads;
				for (let j = 0; j < nodes.length; j++) {
					definitions[nodes[j]] = variable;
					this._referenceVariable(scopes[j], variable);
				}
			}
			definitions[identifier] = variable;
			this._referenceVariable(catchScopes[i], variable);
		}
	}

	/**
	 * Points each read of a `let` or `const` set to a name nothing writes at
	 * that name, terser's `reduce_vars`: the mangler then keeps the scopes
	 * between from naming anything else so, and the alias goes unread.
	 * @returns {number[]} the declarators whose name no read reads any more
	 */
	_substituteAliases() {
		const {
			referenceNodes,
			referenceScopes,
			referenceFlags,
			definitions,
			tree
		} = this;
		/** @type {Map<MinifierVariable, MinifierVariable>} */
		const targets = new Map();
		/** @type {number[]} */
		const declarators = [];
		// The scopes reading `arguments`, which may write a parameter.
		/** @type {Set<Scope>} */
		const readArguments = new Set();
		for (let i = 0; i < referenceNodes.length; i++) {
			if (tree.name(referenceNodes[i]) !== "arguments") continue;
			for (
				let scope = /** @type {Scope | null} */ (referenceScopes[i]);
				scope !== null;
				scope = scope.upper
			) {
				readArguments.add(scope);
			}
		}
		for (const declarator of /** @type {number[]} */ (this.aliasDeclarators)) {
			const alias = definitions[tree.field(0, Field.id, declarator)];
			const target = definitions[this._child(Field.init, declarator)];
			if (
				isMinifierVariable(alias) &&
				isMinifierVariable(target) &&
				alias !== target &&
				!alias.written &&
				// What an `export` names is toplevel, so never an alias here.
				!alias.global &&
				alias.export === 0 &&
				alias.declarations === 1 << alias.kind &&
				!(/** @type {MinifierScope} */ (alias.scope).isPinned()) &&
				!target.written &&
				!target.global &&
				!target.undeclared &&
				target.declarations === 1 << target.kind &&
				(target.kind === DECLARES_LET ||
					target.kind === DECLARES_CONST ||
					(target.kind === DECLARES_FUNARG &&
						!readArguments.has(/** @type {MinifierScope} */ (target.scope)))) &&
				!(/** @type {MinifierScope} */ (target.scope).isPinned()) &&
				encloses(
					/** @type {MinifierScope} */ (target.scope),
					/** @type {MinifierScope} */ (alias.scope)
				)
			) {
				targets.set(alias, target);
				declarators.push(declarator);
			}
		}
		if (targets.size === 0) return declarators;
		// A cycle, `const a = b, b = a`, has no name at its end to read.
		/** @type {MinifierVariable[]} */
		const cyclic = [];
		for (const [alias, target] of targets) {
			let next = /** @type {MinifierVariable | undefined} */ (target);
			for (let steps = 0; next !== undefined; steps++) {
				if (steps === targets.size) {
					cyclic.push(alias);
					break;
				}
				next = targets.get(next);
			}
		}
		for (const alias of cyclic) targets.delete(alias);
		/**
		 * @param {MinifierVariable} alias an alias
		 * @returns {MinifierVariable | undefined} the name at the end of its chain
		 */
		const targetOf = (alias) => {
			let target = targets.get(alias);
			if (target === undefined) return;
			for (
				let next = targets.get(target);
				next !== undefined;
				next = targets.get(next)
			) {
				target = next;
			}
			return target;
		};
		// A read where a scope between declares the target's name stays the
		// alias's; dropping one alias moves the end of chains through it.
		for (let dropped = true; dropped && targets.size !== 0;) {
			dropped = false;
			for (let i = 0; i < referenceNodes.length; i++) {
				if (referenceFlags[i] & REFERENCE_CATCH) continue;
				const alias = /** @type {MinifierVariable} */ (
					definitions[referenceNodes[i]]
				);
				const target = targetOf(alias);
				if (target !== undefined && shadowedFrom(referenceScopes[i], target)) {
					targets.delete(alias);
					dropped = true;
				}
			}
		}
		for (let i = 0; i < referenceNodes.length; i++) {
			const node = referenceNodes[i];
			if (referenceFlags[i] & REFERENCE_CATCH) continue;
			const alias = /** @type {MinifierVariable} */ (definitions[node]);
			const target = targetOf(alias);
			if (target === undefined) continue;
			definitions[node] = target;
			alias.referenceCount--;
			this._referenceVariable(referenceScopes[i], target);
		}
		return declarators.filter((declarator) =>
			targets.has(
				/** @type {MinifierVariable} */ (
					definitions[tree.field(0, Field.id, declarator)]
				)
			)
		);
	}

	/**
	 * Moves each function a declarator names and one read reads to that read,
	 * terser's single use: the read is in the same function, after it in the
	 * statements listing it and in no loop it is not in, making one function.
	 * @returns {number[]} each declarator and its read, in pairs
	 */
	_moveFunctions() {
		const {
			referenceNodes,
			referenceScopes,
			referenceFlags,
			definitions,
			tree
		} = this;
		/** @type {Map<MinifierVariable, number>} */
		const candidates = new Map();
		const bindings = /** @type {number[]} */ (this.functionBindings);
		/** @type {Map<number, number>} */
		const lists = new Map();
		for (let i = 0; i < bindings.length; i += 3) {
			const declarator = bindings[i];
			lists.set(declarator, i);
			const definition = definitions[tree.field(0, Field.id, declarator)];
			// A declared function reads as made where its list starts.
			if (this.types[declarator] === NodeType.FunctionDeclaration) {
				bindings[i + 2] = Infinity;
			}
			if (
				isMinifierVariable(definition) &&
				definition.referenceCount === 1 &&
				!definition.written &&
				!definition.global &&
				definition.export === 0 &&
				definition.declarations === 1 << definition.kind &&
				!(/** @type {MinifierScope} */ (definition.scope).isPinned())
			) {
				candidates.set(definition, declarator);
			}
		}
		/** @type {number[]} */
		const moved = [];
		if (candidates.size === 0) return moved;
		// Per move: the function, the scope reading it and its definition.
		/** @type {number[]} */
		const movedInits = [];
		/** @type {MinifierScope[]} */
		const movedScopes = [];
		/** @type {MinifierVariable[]} */
		const movedDefinitions = [];
		const loops = /** @type {number[]} */ (this.loopRanges);
		/** @type {number[] | undefined} */
		let byStart;
		for (let i = 0; i < referenceNodes.length; i++) {
			const node = referenceNodes[i];
			const definition = /** @type {MinifierVariable} */ (definitions[node]);
			const declarator = candidates.get(definition);
			if (
				declarator === undefined ||
				referenceFlags[i] & (REFERENCE_EXPORTED | REFERENCE_CATCH)
			) {
				continue;
			}
			const scope = referenceScopes[i];
			const init =
				this.types[declarator] === NodeType.FunctionDeclaration
					? declarator
					: this._child(Field.init, declarator);
			if (
				(scope.variableScope !==
					/** @type {MinifierScope} */ (definition.scope).variableScope &&
					// Called, a function of its own `this` shows no other place.
					((referenceFlags[i] & REFERENCE_CALLEE) === 0 ||
						this.types[init] === NodeType.ArrowFunctionExpression ||
						definition.kind === DECLARES_VAR)) ||
				(this.types[declarator] === NodeType.FunctionDeclaration
					? // Hoisted, it is made before any read but its own.
						tree.start(node) >= tree.start(init) &&
						tree.end(node) <= tree.end(init)
					: tree.start(node) < tree.end(init)) ||
				// Only a read the statements listing it reach runs after it.
				tree.end(node) >
					bindings[/** @type {number} */ (lists.get(declarator)) + 2] ||
				entersLoop(
					loops,
					Math.min(
						tree.start(declarator),
						bindings[/** @type {number} */ (lists.get(declarator)) + 1]
					),
					tree.start(node),
					tree.end(node)
				)
			) {
				continue;
			}
			// What it reads from outside is read from the read's place now.
			if (byStart === undefined) {
				byStart = referencesByStart(referenceNodes, tree);
			}
			const start = tree.start(init);
			const end = tree.end(init);
			if (
				scope.variableScope !==
				/** @type {MinifierScope} */ (definition.scope).variableScope
			) {
				let readsArguments = false;
				for (
					let j = firstFrom(byStart, referenceNodes, tree, start);
					j < byStart.length && tree.start(referenceNodes[byStart[j]]) < end;
					j++
				) {
					const read = definitions[referenceNodes[byStart[j]]];
					// Its `arguments.callee` would show a new function each call there.
					if (
						isMinifierVariable(read) &&
						read.kind === DECLARES_FUNARG &&
						/** @type {MinifierScope} */ (read.scope).node === init &&
						tree.name(referenceNodes[byStart[j]]) === "arguments"
					) {
						readsArguments = true;
						break;
					}
				}
				if (readsArguments) continue;
			}
			let shadowed = false;
			for (
				let j = firstFrom(byStart, referenceNodes, tree, start);
				j < byStart.length && tree.start(referenceNodes[byStart[j]]) < end;
				j++
			) {
				const read = definitions[referenceNodes[byStart[j]]];
				if (
					isMinifierVariable(read) &&
					encloses(
						/** @type {MinifierScope} */ (read.scope),
						/** @type {MinifierScope} */ (definition.scope)
					) &&
					shadowedFrom(scope, read)
				) {
					shadowed = true;
					break;
				}
			}
			if (shadowed) continue;
			for (
				let j = firstFrom(byStart, referenceNodes, tree, start);
				j < byStart.length && tree.start(referenceNodes[byStart[j]]) < end;
				j++
			) {
				const read = definitions[referenceNodes[byStart[j]]];
				if (
					isMinifierVariable(read) &&
					encloses(
						/** @type {MinifierScope} */ (read.scope),
						/** @type {MinifierScope} */ (definition.scope)
					)
				) {
					encloseVariable(scope, read);
				}
			}
			definition.referenceCount = 0;
			moved.push(declarator, node);
			movedInits.push(init);
			movedScopes.push(scope);
			movedDefinitions.push(definition);
		}
		// A function moved into one that moves too prints where that one does,
		// so what it reads from outside is read from there as well.
		for (let k = 0; k < moved.length; k += 2) {
			const init = movedInits[k >> 1];
			const start = tree.start(init);
			const end = tree.end(init);
			const definition = movedDefinitions[k >> 1];
			// Bounded, as two functions may each read the other once.
			for (let at = moved[k + 1], steps = moved.length; steps-- > 0;) {
				let holder = -1;
				for (let m = 0; m < moved.length; m += 2) {
					const outer = movedInits[m >> 1];
					if (
						m !== k &&
						tree.start(outer) <= tree.start(at) &&
						tree.end(at) <= tree.end(outer)
					) {
						holder = m;
						break;
					}
				}
				if (holder === -1) break;
				for (
					let j = firstFrom(
						/** @type {number[]} */ (byStart),
						referenceNodes,
						tree,
						start
					);
					j < /** @type {number[]} */ (byStart).length &&
					tree.start(referenceNodes[/** @type {number[]} */ (byStart)[j]]) <
						end;
					j++
				) {
					const read =
						definitions[referenceNodes[/** @type {number[]} */ (byStart)[j]]];
					if (
						isMinifierVariable(read) &&
						encloses(
							/** @type {MinifierScope} */ (read.scope),
							/** @type {MinifierScope} */ (definition.scope)
						)
					) {
						encloseVariable(movedScopes[holder >> 1], read);
					}
				}
				at = moved[holder + 1];
			}
		}
		return moved;
	}

	/**
	 * @param {number[]} identifiers names
	 * @returns {NamedIdentifier[]} each as the mangler reads it: its name and its definition
	 */
	_asNames(identifiers) {
		return identifiers.map((identifier) => ({
			name: this.tree.name(identifier),
			definition: this.definitions[identifier]
		}));
	}
}

/**
 * Analyses a `SyntaxTree` as `analyzeMinifierScope` does terser's tree of
 * the same source.
 * @param {SyntaxTree} tree the tree
 * @param {number} program its program
 * @param {Uint8Array} types each node's type, as terser's tree types it
 * @param {MinifierScopeOptions} options the mangle options
 * @param {(node: number, message: string) => never} raise throws the parse error a misplaced import or export is
 * @returns {MinifierTreeScopeAnalysis} the scopes, and each name's definition
 */
const analyzeMinifierTree = (tree, program, types, options, raise) => {
	if (NodeType === undefined) {
		({ NodeType, Field, Flag, Part } = require("./data"));
	}
	if (listsStatements === undefined) {
		listsStatements = new Uint8Array(256);
		for (const type of [
			NodeType.Program,
			NodeType.BlockStatement,
			NodeType.StaticBlock,
			NodeType.SwitchCase,
			// A function's body is read without a node of its own.
			NodeType.FunctionDeclaration,
			NodeType.FunctionExpression,
			NodeType.ArrowFunctionExpression
		]) {
			listsStatements[type] = 1;
		}
	}
	const analyzer = new MinifierTreeScopeAnalyzer(
		tree,
		program,
		types,
		options,
		raise
	);
	analyzer.stack.push(program);
	analyzer._visitList(Field.body, program);
	analyzer.stack.pop();
	analyzer._resolve();
	const { functionDeclarators, classDeclarators } = analyzer;
	const aliases =
		analyzer.aliasDeclarators === null ? null : analyzer._substituteAliases();
	// A catch parameter moved to its function shares its name with the
	// function's own, so a function moved into the catch would read it.
	const movedFunctions =
		analyzer.functionBindings === null || analyzer.catchNames.length !== 0
			? null
			: analyzer._moveFunctions();
	return {
		aliases,
		movedFunctions,
		toplevel: analyzer.toplevel,
		labels: analyzer.labels,
		globals: analyzer.globals,
		blockDefunScopes: analyzer.blockDefunScopes,
		functionDeclarators:
			functionDeclarators === null
				? null
				: analyzer._asNames(functionDeclarators),
		classDeclarators:
			classDeclarators === null ? null : analyzer._asNames(classDeclarators),
		catchParameters: analyzer._asNames(analyzer.catchParameters),
		namesPrivate: analyzer.namesPrivate,
		spelledNames: analyzer._spelledNames(),
		definitions: analyzer.definitions
	};
};

analyzeScope.Reference = Reference;
analyzeScope.Scope = Scope;
analyzeScope.Variable = Variable;
analyzeScope.MinifierLabel = MinifierLabel;
analyzeScope.MinifierScope = MinifierScope;
analyzeScope.MinifierVariable = MinifierVariable;
analyzeScope.isMinifierVariable = isMinifierVariable;
analyzeScope.analyzeMinifierTree = analyzeMinifierTree;
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
