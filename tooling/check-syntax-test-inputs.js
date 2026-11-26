/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Fails `yarn lint` when a unit test writes the source a syntax entry point
// reads inline: every such input is a fixture under `test/fixtures/<lang>/`,
// which the invariants runner holds to its relations.
//
//   node tooling/check-syntax-test-inputs.js [file…]

const fs = require("fs");
const path = require("path");
const acorn = require("acorn");

const ROOT = path.resolve(__dirname, "..");

/**
 * @param {string} dir a directory, relative to the repository root
 * @returns {string[]} every unit test under it, relative to the root, sorted
 */
const unitTests = (dir) => {
	/** @type {string[]} */
	const out = [];
	for (const entry of fs.readdirSync(path.join(ROOT, dir), {
		withFileTypes: true
	})) {
		const file = `${dir}/${entry.name}`;
		if (entry.isDirectory()) out.push(...unitTests(file));
		else if (entry.name.endsWith(".unittest.js")) out.push(file);
	}
	return out.sort();
};

/** The test files held to fixtures: every unit test, relative to the root. */
const FILES = unitTests("test/unitCases");

/**
 * The entry points whose first argument is a source, called by their own name
 * or as a method; a minimizer's first argument maps asset names to sources.
 */
const ENTRIES = new Set([
	"collectCjsRequireSpecifiers",
	"collectEsmImportSpecifiers",
	"decodeEntities",
	"decodeXmlEntities",
	"minifyOnePass",
	"parse",
	"parseExpressionAt",
	"parseHtml",
	"parseProgram",
	"process",
	"processAsync",
	"readToken",
	"tokenize",
	"tokenizeXml",
	"tokenizer",
	"CssTokenizer"
]);

/** The minimizers, which read each value of their first argument. */
const MINIMIZERS = new Set([
	"cssMinify",
	"htmlMinify",
	"jsMinify",
	"jsonMinify",
	"xmlMinify"
]);

/** The constructors whose second argument is a source, as acorn's `Parser`. */
const SOURCE_SECOND = new Set(["CacheParser", "Parser", "WebpackParser"]);

/** Objects whose `parse` reads something other than a syntax source. */
const NOT_SYNTAX = new Set(["JSON", "path", "url", "Date", "Number"]);

/** Modules whose calls answer paths or file contents, never inline text. */
const OPAQUE_MODULES = new Set(["fs", "os", "path", "url"]);

/** String methods that only read their receiver, whatever they are passed. */
const READ_ONLY_METHODS = new Set([
	"at",
	"charAt",
	"slice",
	"split",
	"substring",
	"toLowerCase",
	"toUpperCase",
	"trim",
	"trimEnd",
	"trimStart"
]);

/** Calls whose answer is read from elsewhere, however they are spelled. */
const OPAQUE_CALLS = new Set([
	"fixture",
	"fixtures",
	"require",
	"readFileSync"
]);

/** @import { Node, Expression, Pattern, Function as FunctionNode, Literal, Identifier, CallExpression, SourceLocation } from "estree" */

/**
 * What a name is bound to.
 * @typedef {{ kind: "value", init: Node | null | undefined } | { kind: "param", fn: FunctionNode, index: number, init: Node | undefined } | { kind: "each", right: Node, path: (number | string)[] } | { kind: "import", name: string } | { kind: "opaque" }} Binding
 */

/**
 * A scope: its names and the scope around it.
 * @typedef {{ names: Map<string, Binding>, parent: Scope | null }} Scope
 */

/**
 * @param {unknown} value a property of a node
 * @returns {value is Node} whether it is a node
 */
const isNode = (value) =>
	value !== null &&
	typeof value === "object" &&
	typeof (/** @type {{ type?: unknown }} */ (value).type) === "string";

/**
 * @param {Node} node a node
 * @returns {Node[]} its child nodes, in source order
 */
const childrenOf = (node) => {
	/** @type {Node[]} */
	const out = [];
	for (const key of Object.keys(node)) {
		if (key === "loc") continue;
		const value = /** @type {Record<string, unknown>} */ (
			/** @type {unknown} */ (node)
		)[key];
		if (Array.isArray(value)) {
			for (const one of value) if (isNode(one)) out.push(one);
		} else if (isNode(value)) {
			out.push(value);
		}
	}
	return out;
};

/**
 * @param {Node} node a node
 * @returns {node is FunctionNode} whether it is a function
 */
const isFunction = (node) =>
	node.type === "FunctionDeclaration" ||
	node.type === "FunctionExpression" ||
	node.type === "ArrowFunctionExpression";

/**
 * @param {Pattern} pattern a binding pattern
 * @param {(name: string, binding: Binding) => void} bind records one name
 * @param {Binding} binding what a bare name binds to
 * @returns {void}
 */
const bindPattern = (pattern, bind, binding) => {
	if (pattern.type === "Identifier") {
		bind(pattern.name, binding);
		return;
	}
	// A destructured loop row binds each name to its column of every row.
	if (binding.kind === "each") {
		/**
		 * @param {Pattern} inner the pattern at one column
		 * @param {number | string} step the column
		 * @returns {void}
		 */
		const column = (inner, step) =>
			bindPattern(inner, bind, { ...binding, path: [...binding.path, step] });
		if (pattern.type === "ArrayPattern") {
			for (const [index, element] of pattern.elements.entries()) {
				if (element !== null && element.type !== "RestElement") {
					column(element, index);
				}
			}
			return;
		}
		if (pattern.type === "ObjectPattern") {
			for (const property of pattern.properties) {
				if (property.type === "RestElement" || property.computed) continue;
				const key =
					property.key.type === "Identifier"
						? property.key.name
						: String(/** @type {Literal} */ (property.key).value);
				column(property.value, key);
			}
			return;
		}
		if (pattern.type === "AssignmentPattern") {
			bindPattern(pattern.left, bind, binding);
		}
		return;
	}
	// A destructured name is opaque, unless it renames an import.
	const fromRequire =
		binding.kind === "value" &&
		isNode(binding.init) &&
		(binding.init.type === "CallExpression" ||
			(binding.init.type === "MemberExpression" && !binding.init.computed));
	if (pattern.type === "ObjectPattern") {
		for (const property of pattern.properties) {
			if (property.type === "RestElement") {
				bindPattern(property.argument, bind, { kind: "opaque" });
			} else if (
				fromRequire &&
				property.key.type === "Identifier" &&
				property.value.type === "Identifier"
			) {
				bind(property.value.name, { kind: "import", name: property.key.name });
			} else {
				bindPattern(property.value, bind, { kind: "opaque" });
			}
		}
	} else if (pattern.type === "ArrayPattern") {
		for (const element of pattern.elements) {
			if (element !== null) bindPattern(element, bind, { kind: "opaque" });
		}
	} else if (pattern.type === "AssignmentPattern") {
		bindPattern(pattern.left, bind, binding);
	} else if (pattern.type === "RestElement") {
		bindPattern(pattern.argument, bind, { kind: "opaque" });
	}
};

/**
 * @param {Scope} scope a scope
 * @param {Node[]} statements the statements declared in it
 * @returns {void}
 */
const hoist = (scope, statements) => {
	/**
	 * @param {string} name a name
	 * @param {Binding} binding what it binds to
	 */
	const bind = (name, binding) => {
		scope.names.set(name, binding);
	};
	for (const statement of statements) {
		if (statement.type === "VariableDeclaration") {
			for (const declarator of statement.declarations) {
				bindPattern(declarator.id, bind, {
					kind: "value",
					init: declarator.init
				});
			}
		} else if (statement.type === "FunctionDeclaration" && statement.id) {
			bind(statement.id.name, { kind: "value", init: statement });
		} else if (statement.type === "ClassDeclaration" && statement.id) {
			bind(statement.id.name, { kind: "opaque" });
		}
	}
};

/**
 * @param {Node} node a node
 * @param {Scope} scope the scope it is in
 * @returns {Scope} the scope its children are in: a new one where it opens one
 */
const scopeAt = (node, scope) => {
	/** @type {Scope} */
	const inner = { names: new Map(), parent: scope };
	/**
	 * @param {string} name a name
	 * @param {Binding} binding what it binds to
	 */
	const bind = (name, binding) => {
		inner.names.set(name, binding);
	};
	if (isFunction(node)) {
		if (node.type === "FunctionExpression" && node.id) {
			bind(node.id.name, { kind: "value", init: node });
		}
		for (const [index, param] of node.params.entries()) {
			bindPattern(param, bind, {
				kind: "param",
				fn: node,
				index,
				init: param.type === "AssignmentPattern" ? param.right : undefined
			});
		}
		return inner;
	}
	if (
		node.type === "Program" ||
		node.type === "BlockStatement" ||
		node.type === "StaticBlock"
	) {
		hoist(inner, /** @type {Node[]} */ (node.body));
		return inner;
	}
	if (node.type === "ForStatement" && node.init) {
		hoist(inner, [node.init]);
		return inner;
	}
	if (
		(node.type === "ForOfStatement" || node.type === "ForInStatement") &&
		node.left.type === "VariableDeclaration"
	) {
		const right = node.type === "ForOfStatement" ? node.right : null;
		for (const declarator of node.left.declarations) {
			bindPattern(
				declarator.id,
				bind,
				right === null ? { kind: "opaque" } : { kind: "each", right, path: [] }
			);
		}
		return inner;
	}
	return scope;
};

/**
 * Every place in a test file where a syntax source is written inline: a string
 * or template literal, or an expression building one, given as the source to
 * an entry point, or to a local function that hands it on to one.
 * @param {string} code the test file's text
 * @returns {{ line: number, callee: string }[]} one entry per inline source
 */
const inlineInputs = (code) => {
	const ast = /** @type {Node} */ (
		/** @type {unknown} */ (
			acorn.parse(code, { ecmaVersion: "latest", locations: true })
		)
	);
	/** @type {Map<Node, Scope>} */
	const scopeOf = new Map();
	/** @type {Node[]} */
	const calls = [];

	/**
	 * @param {Node} node a node
	 * @param {Scope} scope the scope it is in
	 * @returns {void}
	 */
	const collect = (node, scope) => {
		const inner = scopeAt(node, scope);
		if (node.type === "Identifier") {
			scopeOf.set(node, scope);
		} else if (
			node.type === "CallExpression" ||
			node.type === "NewExpression"
		) {
			calls.push(node);
		}
		for (const child of childrenOf(node)) {
			if (
				(node.type === "MemberExpression" &&
					child === node.property &&
					!node.computed) ||
				(node.type === "Property" && child === node.key && !node.computed)
			) {
				continue;
			}
			collect(child, inner);
		}
	};
	collect(ast, { names: new Map(), parent: null });

	/**
	 * @param {Identifier} node a reference
	 * @returns {Binding | undefined} what it is bound to
	 */
	const resolve = (node) => {
		for (
			let /** @type {Scope | null | undefined} */ scope = scopeOf.get(node);
			scope;
			scope = scope.parent
		) {
			const binding = scope.names.get(node.name);
			if (binding !== undefined) return binding;
		}
		return undefined;
	};

	/** @type {Map<FunctionNode, Set<number>>} */
	const flows = new Map();

	/**
	 * @param {Node} node a callee
	 * @returns {string} its name, as a message gives it
	 */
	const nameOf = (node) => {
		if (node.type === "Identifier") return node.name;
		if (node.type === "MemberExpression") {
			const property =
				node.property.type === "Identifier" ? node.property.name : "[…]";
			return `${nameOf(node.object)}.${property}`;
		}
		if (node.type === "NewExpression" || node.type === "CallExpression") {
			return nameOf(node.callee);
		}
		return node.type;
	};

	/**
	 * @param {Node} callee a callee
	 * @returns {Node | undefined} the function it names, where it names a local one
	 */
	const localFunction = (callee) => {
		if (callee.type !== "Identifier") return undefined;
		const binding = resolve(callee);
		if (binding === undefined || binding.kind !== "value") return undefined;
		const { init } = binding;
		return isNode(init) && isFunction(init) ? init : undefined;
	};

	/**
	 * @param {Node} call a call
	 * @returns {{ index: number, values: boolean }[]} its source arguments; `values` for a minimizer's asset map
	 */
	const sourceArguments = (call) => {
		if (call.type !== "CallExpression" && call.type !== "NewExpression") {
			return [];
		}
		const { callee } = call;
		let name;
		if (callee.type === "Identifier") {
			const binding = resolve(callee);
			name =
				binding !== undefined && binding.kind === "import"
					? binding.name
					: callee.name;
			const fn = localFunction(callee);
			if (fn !== undefined) {
				const indices = flows.get(/** @type {FunctionNode} */ (fn));
				return indices === undefined
					? []
					: [...indices].map((index) => ({ index, values: false }));
			}
		} else if (
			callee.type === "MemberExpression" &&
			!callee.computed &&
			callee.property.type === "Identifier"
		) {
			name = callee.property.name;
			if (
				callee.object.type === "Identifier" &&
				NOT_SYNTAX.has(callee.object.name)
			) {
				return [];
			}
		} else {
			return [];
		}
		if (call.type === "NewExpression" && SOURCE_SECOND.has(name)) {
			return [{ index: 1, values: false }];
		}
		if (MINIMIZERS.has(name)) return [{ index: 0, values: true }];
		if (ENTRIES.has(name) || /^parseA[A-Z]/.test(name)) {
			return [{ index: 0, values: false }];
		}
		return [];
	};

	/**
	 * @param {Node} node an expression
	 * @param {Set<Binding>} seen the bindings already followed
	 * @returns {boolean} whether it writes a string out
	 */
	const writesText = (node, seen) => writesTextOf(node, seen);

	/**
	 * @param {Node} node an expression
	 * @param {Set<Binding>} seen the bindings already followed
	 * @returns {Node[]} the expressions it may stand for, followed through plain names
	 */
	const valuesOf = (node, seen) => {
		if (node.type !== "Identifier") return [node];
		const binding = resolve(node);
		if (binding === undefined || seen.has(binding)) return [];
		if (binding.kind === "value" && isNode(binding.init)) {
			return valuesOf(binding.init, new Set([...seen, binding]));
		}
		if (binding.kind === "each") {
			const inner = new Set([...seen, binding]);
			const picked = columnOf(rowsOf(binding.right, inner), binding.path);
			return picked === undefined
				? []
				: picked.flatMap((one) => valuesOf(one, inner));
		}
		return [];
	};

	/**
	 * @param {Node} right what a `for…of` loop reads
	 * @param {Set<Binding>} seen the bindings already followed
	 * @returns {Node[] | undefined} its rows, where they can be read; an `Object.entries` row is an array of key and value
	 */
	const rowsOf = (right, seen) => {
		if (
			right.type === "CallExpression" &&
			right.callee.type === "MemberExpression" &&
			right.callee.object.type === "Identifier" &&
			right.callee.object.name === "Object" &&
			right.callee.property.type === "Identifier" &&
			right.arguments.length === 1
		) {
			const method = right.callee.property.name;
			/** @type {Node[]} */
			const rows = [];
			for (const object of valuesOf(
				/** @type {Node} */ (right.arguments[0]),
				seen
			)) {
				if (object.type !== "ObjectExpression") return undefined;
				for (const property of object.properties) {
					if (property.type !== "Property") return undefined;
					const key = /** @type {Node} */ (
						property.computed || property.key.type !== "Identifier"
							? property.key
							: { type: "Literal", value: property.key.name }
					);
					const value = /** @type {Node} */ (property.value);
					if (method === "entries") {
						rows.push(
							/** @type {Node} */ ({
								type: "ArrayExpression",
								elements: [key, value]
							})
						);
					} else if (method === "values") {
						rows.push(value);
					} else if (method === "keys") {
						rows.push(key);
					} else {
						return undefined;
					}
				}
			}
			return rows;
		}
		/** @type {Node[]} */
		const rows = [];
		for (const list of valuesOf(right, seen)) {
			if (list.type !== "ArrayExpression") return undefined;
			for (const element of list.elements) {
				if (element !== null) rows.push(element);
			}
		}
		return rows;
	};

	/**
	 * @param {Node[] | undefined} rows the rows a loop or a lookup reads
	 * @param {(number | string)[]} path the column, one step per level
	 * @param {boolean=} anyStep whether the first step is any element or property
	 * @returns {Node[] | undefined} what each row holds there, where it can be read
	 */
	const columnOf = (rows, path, anyStep = false) => {
		if (rows === undefined) return undefined;
		let current = rows;
		if (anyStep) {
			/** @type {Node[]} */
			const next = [];
			for (const row of current) {
				if (row.type === "ArrayExpression") {
					for (const element of row.elements) {
						if (element !== null) next.push(element);
					}
				} else if (row.type === "ObjectExpression") {
					for (const property of row.properties) {
						next.push(
							/** @type {Node} */ (
								property.type === "Property"
									? property.value
									: property.argument
							)
						);
					}
				} else {
					return undefined;
				}
			}
			current = next;
		}
		for (const step of path) {
			/** @type {Node[]} */
			const next = [];
			for (const row of current) {
				if (row.type === "ArrayExpression" && typeof step === "number") {
					const element = row.elements[step];
					if (element) next.push(element);
				} else if (row.type === "ObjectExpression") {
					for (const property of row.properties) {
						if (
							property.type === "Property" &&
							!property.computed &&
							((property.key.type === "Identifier" &&
								property.key.name === String(step)) ||
								(property.key.type === "Literal" &&
									String(property.key.value) === String(step)))
						) {
							next.push(/** @type {Node} */ (property.value));
						}
					}
				} else {
					return undefined;
				}
			}
			current = next;
		}
		return current;
	};

	/**
	 * @param {Node} node an expression
	 * @param {Set<Binding>} seen the bindings already followed
	 * @returns {boolean} whether it writes text
	 */
	const writesTextOf = (node, seen) => {
		switch (node.type) {
			case "Literal":
				return typeof node.value === "string";
			case "TemplateLiteral":
			case "TaggedTemplateExpression":
				return true;
			case "Identifier": {
				const binding = resolve(node);
				if (binding === undefined || seen.has(binding)) return false;
				seen.add(binding);
				if (binding.kind === "value") {
					return isNode(binding.init) && writesText(binding.init, seen);
				}
				if (binding.kind === "param") {
					return binding.init !== undefined && writesText(binding.init, seen);
				}
				if (binding.kind === "each") {
					const picked = columnOf(rowsOf(binding.right, seen), binding.path);
					if (picked === undefined) {
						// Rows read from elsewhere: a column of one is as opaque as it is.
						return binding.path.length === 0 && writesText(binding.right, seen);
					}
					return picked.some((one) => writesText(one, seen));
				}
				return false;
			}
			case "MemberExpression": {
				if (!node.computed) return false;
				const step =
					node.property.type === "Literal" &&
					(typeof node.property.value === "number" ||
						typeof node.property.value === "string")
						? node.property.value
						: undefined;
				const picked = columnOf(
					valuesOf(/** @type {Node} */ (node.object), seen),
					step === undefined ? [] : [step],
					step === undefined
				);
				return (
					picked !== undefined && picked.some((one) => writesText(one, seen))
				);
			}
			case "CallExpression":
			case "NewExpression": {
				const { callee } = node;
				const name =
					callee.type === "Identifier"
						? callee.name
						: callee.type === "MemberExpression" &&
							  callee.property.type === "Identifier"
							? callee.property.name
							: "";
				if (OPAQUE_CALLS.has(name)) return false;
				if (
					callee.type === "MemberExpression" &&
					callee.object.type === "Identifier" &&
					OPAQUE_MODULES.has(callee.object.name)
				) {
					return false;
				}
				const fn = localFunction(callee);
				if (fn !== undefined) {
					const indices = flows.get(/** @type {FunctionNode} */ (fn));
					return (
						indices !== undefined &&
						[...indices].some((index) => {
							const one = node.arguments[index];
							return one !== undefined && writesText(one, seen);
						})
					);
				}
				const object =
					callee.type === "MemberExpression" ? [callee.object] : [];
				if (object.length > 0 && READ_ONLY_METHODS.has(name)) {
					return writesText(object[0], seen);
				}
				return [...object, ...node.arguments].some((one) =>
					writesText(one, seen)
				);
			}
			case "BinaryExpression":
				return (
					node.operator === "+" &&
					(writesText(node.left, seen) || writesText(node.right, seen))
				);
			case "ConditionalExpression":
				return (
					writesText(node.consequent, seen) || writesText(node.alternate, seen)
				);
			case "LogicalExpression":
				return writesText(node.left, seen) || writesText(node.right, seen);
			case "SequenceExpression":
				return writesText(node.expressions[node.expressions.length - 1], seen);
			case "ArrayExpression":
				return node.elements.some(
					(element) => element !== null && writesText(element, seen)
				);
			case "SpreadElement":
				return writesText(node.argument, seen);
			case "ObjectExpression":
				return node.properties.some((property) =>
					writesText(
						property.type === "SpreadElement"
							? property.argument
							: property.value,
						seen
					)
				);
			case "AwaitExpression":
				return writesText(node.argument, seen);
			default:
				return false;
		}
	};

	/**
	 * @param {Node} node an expression
	 * @returns {{ fn: FunctionNode, index: number } | undefined} the parameter it is, followed through plain names
	 */
	const paramOf = (node) => {
		/** @type {Set<Binding>} */
		const seen = new Set();
		let current = node;
		while (current.type === "Identifier") {
			const binding = resolve(current);
			if (binding === undefined || seen.has(binding)) return undefined;
			seen.add(binding);
			if (binding.kind === "param") return binding;
			if (binding.kind !== "value" || !isNode(binding.init)) return undefined;
			current = binding.init;
		}
		return undefined;
	};

	/** @type {Map<Node, string>} */
	const found = new Map();
	for (let changed = true; changed;) {
		changed = false;
		found.clear();
		for (const call of calls) {
			const { callee, arguments: args } = /** @type {CallExpression} */ (call);
			for (const { index, values } of sourceArguments(call)) {
				const argument = args[index];
				// An object written where a source goes is a preparsed tree, not text.
				if (
					argument === undefined ||
					argument.type === "SpreadElement" ||
					(!values && argument.type === "ObjectExpression")
				) {
					continue;
				}
				const param = values ? undefined : paramOf(argument);
				if (param !== undefined) {
					const indices = flows.get(param.fn) || new Set();
					if (!indices.has(param.index)) {
						indices.add(param.index);
						flows.set(param.fn, indices);
						changed = true;
					}
					if (param.fn.params[param.index].type !== "AssignmentPattern") {
						continue;
					}
				}
				if (writesText(argument, new Set())) {
					found.set(argument, nameOf(callee));
				}
			}
			// `it.each(table)(title, fn)`: a row's cell the callback hands on.
			const each = /** @type {CallExpression} */ (call);
			if (
				each.type === "CallExpression" &&
				callee.type === "CallExpression" &&
				callee.callee.type === "MemberExpression" &&
				callee.callee.property.type === "Identifier" &&
				callee.callee.property.name === "each"
			) {
				const fn = each.arguments.find((one) => isNode(one) && isFunction(one));
				const indices =
					fn === undefined
						? undefined
						: flows.get(/** @type {FunctionNode} */ (fn));
				let table = callee.arguments[0];
				if (table !== undefined && table.type === "Identifier") {
					const binding = resolve(table);
					if (
						binding !== undefined &&
						binding.kind === "value" &&
						isNode(binding.init)
					) {
						table = /** @type {Expression} */ (binding.init);
					}
				}
				if (
					indices !== undefined &&
					table !== undefined &&
					table.type === "ArrayExpression"
				) {
					for (const row of table.elements) {
						if (row === null) continue;
						for (const index of indices) {
							const cell =
								row.type === "ArrayExpression"
									? row.elements[index]
									: index === 0
										? row
										: null;
							if (isNode(cell) && writesText(cell, new Set())) {
								found.set(cell, `${nameOf(callee.callee)} row`);
							}
						}
					}
				}
			}
		}
	}
	return [...found]
		.map(([node, callee]) => ({
			line: /** @type {SourceLocation} */ (node.loc).start.line,
			callee
		}))
		.sort((a, b) => a.line - b.line);
};

if (require.main === module) {
	const files = process.argv.length > 2 ? process.argv.slice(2) : FILES;
	let count = 0;
	for (const file of files) {
		const found = inlineInputs(
			fs.readFileSync(path.resolve(ROOT, file), "utf8")
		);
		for (const { line, callee } of found) {
			console.error(`${file}:${line} writes the source ${callee} reads inline`);
		}
		count += found.length;
	}
	if (count > 0) {
		console.error(
			`Move ${
				count === 1 ? "it" : "each"
			} into test/fixtures/<lang>/<name>/ and read it with fixture() (see "fixtures/" in TESTING_DOCS.md).`
		);
		process.exitCode = 1;
	} else {
		console.log(
			`${files.length} unit test files read every syntax source from fixtures`
		);
	}
}

module.exports = { FILES, inlineInputs };
