/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

/** @typedef {import("estree").Function} ESTreeFunction */
/** @typedef {import("estree").Identifier} Identifier */
/** @typedef {import("estree").Node} Node */
/** @typedef {import("estree").Program} Program */

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
	 * @param {string} type one of "global", "module", "function", "function-expression-name", "block", "switch", "catch", "with", "for", "class", "class-field-initializer", "class-static-block"
	 * @param {Node} block the node that opened this scope
	 * @param {Scope | null} upper the enclosing scope
	 * @param {boolean} isVarScope whether `var` and function declarations hoist to here
	 */
	constructor(type, block, upper, isVarScope) {
		/** @type {string} */
		this.type = type;
		/** @type {Node} */
		this.block = block;
		/** @type {Scope | null} */
		this.upper = upper;
		/** @type {Scope[]} */
		this.childScopes = NO_CHILD_SCOPES;
		/** @type {Variable[]} */
		this.variables = NO_VARIABLE_LIST;
		/** @type {Map<string, Variable>} */
		this.set = NO_VARIABLES;
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
		if (upper !== null) {
			if (upper.childScopes === NO_CHILD_SCOPES) upper.childScopes = [];
			upper.childScopes.push(this);
		}
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
		this.identifiers = [];
		/** @type {Reference[]} occurrences that resolved here, at any depth */
		this.references = [];
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
 * collection when the scope first needs it, which also lets the resolution
 * loop skip a binding-less scope with a pointer compare instead of a lookup.
 * None of them is ever mutated.
 * @type {Map<string, Variable>}
 */
const NO_VARIABLES = new Map();
/** @type {Variable[]} */
const NO_VARIABLE_LIST = [];
/** @type {Scope[]} */
const NO_CHILD_SCOPES = [];

/**
 * Swaps a scope's shared empty stand-ins for collections of its own, on the
 * first binding it receives. `set` and `variables` always fill together.
 * @param {Scope} scope the scope about to declare a name
 * @returns {void}
 */
const openBindings = (scope) => {
	if (scope.set === NO_VARIABLES) {
		scope.set = new Map();
		scope.variables = [];
	}
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
 * @param {Reference} reference the reference being resolved
 * @param {number} boundary source offset where that function's body starts
 * @returns {boolean} true when resolution must skip this binding and climb
 * @example
 * ```js
 * const x = 1;
 * function f(a = x) { const x = 2; }
 * // the default reads the outer `x`; the body's `x` does not exist yet
 * ```
 */
const isHiddenBodyBinding = (variable, reference, boundary) => {
	// a reference in the body sees everything the scope holds
	if (
		/** @type {Identifier & Offset} */ (reference.identifier).start >= boundary
	) {
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
	constructor() {
		/** @type {Scope} the scope the walker is currently inside */
		this.scope = /** @type {Scope} */ (/** @type {unknown} */ (null));
		/** @type {Reference[]} references awaiting resolution */
		this.pendingReferences = [];
	}

	/**
	 * @param {string} type scope kind
	 * @param {Node} block node opening the scope
	 * @param {boolean} isVarScope whether `var` hoists to here
	 * @returns {Scope} the new scope, now current
	 */
	_push(type, block, isVarScope) {
		const scope = new Scope(type, block, this.scope, isVarScope);
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
		let variable = scope.set.get(name);
		if (variable === undefined) {
			variable = new Variable(name, scope);
			openBindings(scope);
			scope.set.set(name, variable);
			scope.variables.push(variable);
		}
		variable.identifiers.push(node);
	}

	/**
	 * Records an identifier occurrence to be resolved once the walk is done.
	 * @param {Node} node the identifier
	 * @returns {void}
	 */
	_reference(node) {
		this.pendingReferences.push(
			new Reference(/** @type {Identifier} */ (node), this.scope)
		);
	}

	/**
	 * Walks a binding pattern, invoking `onBinding` for each name it binds.
	 *
	 * Expressions inside the pattern — computed keys, default values, the
	 * object of a member target — are not visited here; they are returned so
	 * the caller can visit them once every name in the pattern is bound.
	 * @param {Node} root the pattern
	 * @param {(node: Node, defaults: number) => void} onBinding called per bound identifier, with the number of enclosing defaults
	 * @returns {Node[]} expressions still to visit
	 */
	_pattern(root, onBinding) {
		// a bare identifier is ~97% of calls and holds no expressions, so it
		// needs neither the result array nor the walker closure
		if (root.type === "Identifier") {
			onBinding(root, 0);
			return NO_RIGHT_HAND_NODES;
		}

		/** @type {Node[]} */
		const rightHandNodes = [];
		let defaults = 0;

		/**
		 * @param {Node | null} node current pattern node
		 * @returns {void}
		 */
		const walk = (node) => {
			if (node === null || node === undefined) return;
			switch (node.type) {
				case "Identifier":
					onBinding(node, defaults);
					return;
				case "ObjectPattern":
					for (const property of node.properties) walk(property);
					return;
				case "ArrayPattern":
					for (const element of node.elements) walk(element);
					return;
				case "Property":
					if (node.computed) rightHandNodes.push(node.key);
					walk(node.value);
					return;
				case "AssignmentPattern":
					defaults++;
					walk(node.left);
					rightHandNodes.push(node.right);
					defaults--;
					return;
				case "RestElement":
				case "SpreadElement":
					walk(node.argument);
					return;
				case "MemberExpression":
					// the object is only read; the write lands on its property
					if (node.computed) rightHandNodes.push(node.property);
					rightHandNodes.push(node.object);
					return;
				// assignment targets the parser reports as expressions
				case "ArrayExpression":
					for (const element of node.elements) walk(element);
					return;
				case "ObjectExpression":
					for (const property of node.properties) walk(property);
					return;
				case "AssignmentExpression":
					defaults++;
					walk(node.left);
					rightHandNodes.push(node.right);
					defaults--;
					return;
				default:
					rightHandNodes.push(node);
			}
		};

		walk(root);
		return rightHandNodes;
	}

	/**
	 * @param {Node[]} nodes statement or expression list
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
			const variable = new Variable("arguments", scope);
			openBindings(scope);
			scope.set.set("arguments", variable);
			scope.variables.push(variable);
		}

		const params = node.params;
		if (params.length !== 0) {
			scope.paramBoundary = /** @type {Node & Offset} */ (node.body).start;
			for (let i = 0; i < params.length; i++) {
				const rightHandNodes = this._pattern(params[i], (id, defaults) => {
					this._define(scope, id);
					for (let d = 0; d < defaults; d++) this._reference(id);
				});
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
			this._pattern(left.declarations[0].id, (id) => {
				this._reference(id);
			});
		} else {
			const rightHandNodes = this._pattern(left, (id, defaults) => {
				for (let d = 0; d < defaults; d++) this._reference(id);
				this._reference(id);
			});
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

			case "BlockStatement":
				this._push("block", node, false);
				this._visitAll(node.body);
				this._pop();
				return;

			case "SwitchStatement":
				this._visit(node.discriminant);
				this._push("switch", node, false);
				this._visitAll(node.cases);
				this._pop();
				return;

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
						(id, defaults) => {
							this._define(target, id);
							for (let d = 0; d < defaults; d++) this._reference(id);
							if (initialized) this._reference(id);
						}
					);
					this._visitAll(rightHandNodes);
					if (initialized) this._visit(init);
				}
				return;
			}

			case "AssignmentExpression":
				if (isPattern(node.left)) {
					if (node.operator === "=") {
						const rightHandNodes = this._pattern(node.left, (id, defaults) => {
							for (let d = 0; d < defaults; d++) this._reference(id);
							this._reference(id);
						});
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
					const rightHandNodes = this._pattern(node.param, (id, defaults) => {
						this._define(this.scope, id);
						for (let d = 0; d < defaults; d++) this._reference(id);
					});
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
		const references = this.pendingReferences;
		/** @type {Reference[]} */
		const unresolved = [];

		for (let i = 0; i < references.length; i++) {
			const reference = references[i];
			const name = reference.identifier.name;
			/** @type {Scope | null} */
			let scope = reference.from;
			let resolved = false;

			while (scope !== null) {
				const variables = scope.set;
				const variable =
					variables === NO_VARIABLES ? undefined : variables.get(name);
				if (variable !== undefined) {
					// `-1` is every scope but a function scope with parameters, so
					// the common case is one integer compare and no call
					const boundary = scope.paramBoundary;
					if (
						boundary === -1 ||
						!isHiddenBodyBinding(variable, reference, boundary)
					) {
						variable.references.push(reference);
						reference.resolved = variable;
						resolved = true;
						break;
					}
				}
				scope = scope.upper;
			}

			if (!resolved) unresolved.push(reference);
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
 * Analyses a generated module source as a strict ES module.
 * @param {Program} ast the program to analyse
 * @returns {ScopeAnalysis} the scope tree and the module's free references
 */
const analyzeScope = (ast) => {
	const analyzer = new ScopeAnalyzer();
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
