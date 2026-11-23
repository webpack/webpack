"use strict";

const { fixture } = require("../../helpers/fixture");

const fs = require("fs");
const path = require("path");
const { HookMap } = require("tapable");
const JavascriptParser = require("../../../lib/javascript/JavascriptParser");

/** @typedef {import("estree").Node} Node */
/** @typedef {import("../../../lib/javascript/JavascriptParser").JavascriptNodeReader} JavascriptNodeReader */
/** @typedef {{ tap: (options: { name: string, path?: true }, fn: (...args: EXPECTED_ANY[]) => EXPECTED_ANY) => void, constructor: { name: string } }} AnyHook */

const ROOT = path.resolve(__dirname, "../../..");

// names the HookMaps are tapped for: free variables, members and node types
const KEYS = [
	"require",
	"module",
	"exports",
	"define",
	"this",
	"import.meta",
	"Object",
	"Object.defineProperty",
	"Array",
	"Symbol",
	"console",
	"process",
	"undefined",
	"__webpack_require__",
	"fn",
	"a",
	"b",
	"x",
	"Identifier",
	"MemberExpression",
	"CallExpression",
	"NewExpression",
	"ConditionalExpression",
	"LogicalExpression",
	"BinaryExpression",
	"UnaryExpression",
	"TemplateLiteral",
	"TaggedTemplateExpression",
	"Literal",
	"ArrayExpression",
	"ChainExpression",
	"MetaProperty",
	"ThisExpression",
	"VariableDeclaration",
	"FunctionDeclaration",
	"ClassDeclaration",
	"ImportDeclaration",
	"ExportNamedDeclaration"
];

/**
 * Describes a hook argument the same way for both inputs.
 * @param {unknown} value the argument
 * @returns {string} its description
 */
const describeValue = (value) => {
	if (value !== null && typeof value === "object") {
		const node = /** @type {Node} */ (value);
		if (typeof node.type === "string" && Array.isArray(node.range)) {
			return `${node.type}@${node.range[0]}-${node.range[1]}`;
		}
		return Array.isArray(value) ? `[${value.length}]` : "{}";
	}
	return typeof value === "string" ? JSON.stringify(value) : String(value);
};

/**
 * Describes a path tap's argument, a node where the object tap got one.
 * @param {JavascriptNodeReader} reader the path tap's reader
 * @param {unknown} value the argument
 * @param {boolean} isNode whether the object tap got a node here
 * @returns {string} its description
 */
const describePathValue = (reader, value, isNode) => {
	if (!isNode || typeof value !== "number") return describeValue(value);
	return `${reader.type(value)}@${reader.start(value)}-${reader.end(value)}`;
};

/**
 * The ESTree AST a loader could hand webpack for a source, with its comments.
 * @param {string} source the source
 * @returns {import("../../../lib/module/Parser").PreparsedAst} the program
 */
const preparsedAst = (source) => {
	const { parseProgram, toEstreeObject } =
		require("../../../lib/javascript/syntax").parser;
	/**
	 * @param {"auto" | "script"} sourceType what to read it as
	 * @returns {import("../../../lib/module/Parser").PreparsedAst} the program, as plain objects
	 */
	const parseAs = (sourceType) => {
		/** @type {import("../../../lib/javascript/syntax-parser").CollectedComment[]} */
		const comments = [];
		const program = parseProgram(source, 0, {
			sourceType,
			allowReturnOutsideFunction: sourceType === "script",
			comments
		});
		return /** @type {import("../../../lib/module/Parser").PreparsedAst} */ (
			Object.assign(/** @type {object} */ (toEstreeObject(program)), {
				comments
			})
		);
	};
	try {
		return parseAs("auto");
	} catch (_err) {
		return parseAs("script");
	}
};

/**
 * Parses a source with every hook tapped, once by object and once by path.
 * @param {string} source the source
 * @param {boolean} preparsed whether to pass it as an ESTree AST, as a loader can
 * @returns {string[]} each hook call, in order
 */
const trace = (source, preparsed) => {
	const parser = new JavascriptParser("auto");
	/** @type {string[]} */
	const calls = [];
	/**
	 * @param {string} name the hook's name
	 * @param {AnyHook} hook the hook
	 */
	const tapHook = (name, hook) => {
		const waterfall = hook.constructor.name.includes("Waterfall");
		// which arguments of the call the object tap saw as nodes
		/** @type {boolean[]} */
		let nodes = [];
		hook.tap({ name: "trace" }, (...args) => {
			nodes = args.map((a) => describeValue(a).includes("@"));
			calls.push(`${name}(${args.map(describeValue)})`);
			return waterfall ? args[0] : undefined;
		});
		if (waterfall) return;
		hook.tap(
			{ name: "trace-path", path: true },
			(/** @type {JavascriptNodeReader} */ reader, ...args) => {
				const described = args.map((a, i) =>
					describePathValue(reader, a, nodes[i])
				);
				calls.push(`${name}#(${described})`);
			}
		);
	};
	for (const [name, hook] of Object.entries(parser.hooks)) {
		if (hook instanceof HookMap) {
			for (const key of KEYS) {
				tapHook(`${name}.${key}`, /** @type {AnyHook} */ (hook.for(key)));
			}
		} else if (!name.startsWith("evaluate")) {
			tapHook(name, /** @type {AnyHook} */ (/** @type {unknown} */ (hook)));
		}
	}
	parser.parse(
		preparsed ? preparsedAst(source) : source,
		/** @type {import("../../../lib/module/Parser").ParserState} */ (
			/** @type {unknown} */ ({ source })
		)
	);
	return calls;
};

/**
 * Describes an evaluation the same way for both inputs.
 * @param {import("../../../lib/javascript/BasicEvaluatedExpression")} evaluated the evaluation
 * @returns {string} its description
 */
const describeEvaluated = (evaluated) => {
	const range = evaluated.range;
	return JSON.stringify([
		evaluated.type,
		evaluated.isCompileTimeValue() ? String(evaluated.asCompileTimeValue()) : 0,
		evaluated.asBool(),
		evaluated.asString(),
		evaluated.identifier === undefined ? 0 : String(evaluated.identifier),
		evaluated.couldHaveSideEffects(),
		range === undefined ? 0 : range
	]);
};

/**
 * Parses a source with a few hooks tapped, so the walk keeps its fast paths,
 * and evaluates each call's arguments and each `if` test.
 * @param {string} source the source
 * @param {boolean} preparsed whether to pass it as an ESTree AST, as a loader can
 * @param {boolean} strictOutput whether the output is strict ESM
 * @returns {string[]} each evaluation and member chain, in order
 */
const evaluations = (source, preparsed, strictOutput) => {
	const parser = new JavascriptParser("auto");
	/** @type {string[]} */
	const results = [];
	/**
	 * @param {import("estree").Node} expression an expression
	 */
	const evaluate = (expression) => {
		const evaluated = parser.evaluateExpression(
			/** @type {import("estree").Expression} */ (expression)
		);
		results.push(describeEvaluated(evaluated));
	};
	/**
	 * @param {import("estree").Node} expression an expression a tap got
	 */
	const destructured = (expression) => {
		const names = parser.destructuringAssignmentPropertiesFor(
			/** @type {import("estree").Expression} */ (expression)
		);
		if (names !== undefined) {
			results.push(`{${[...names].map((name) => name.id)}}`);
		}
	};
	/**
	 * Folds a test the way `ConstPlugin` does, when it evaluates to a boolean.
	 * @param {import("estree").Node} test the test
	 * @returns {boolean | undefined} its value
	 */
	const fold = (test) => {
		const evaluated = parser.evaluateExpression(
			/** @type {import("estree").Expression} */ (test)
		);
		results.push(describeEvaluated(evaluated));
		const bool = evaluated.asBool();
		return typeof bool === "boolean" ? bool : undefined;
	};
	parser.hooks.statementIf.tap("evaluate", (statement) => fold(statement.test));
	parser.hooks.expressionConditionalOperator.tap("evaluate", (expression) =>
		fold(expression.test)
	);
	parser.hooks.expressionLogicalOperator.tap("evaluate", (expression) => {
		const bool = fold(expression.left);
		if (bool === undefined) return;
		return expression.operator === "&&" ? bool : !bool;
	});
	// a guard for every comparison, as an import's presence check makes one
	parser.hooks.collectGuards.tap("evaluate", (expression) =>
		expression.type === "BinaryExpression"
			? { consequent: {}, alternate: {} }
			: undefined
	);
	parser.hooks.canRename.for("b").tap("evaluate", () => true);
	parser.hooks.rename.for("b").tap("evaluate", (expression) => {
		results.push(`rename ${describeValue(expression)}`);
		return true;
	});
	parser.hooks.isPure.for("Literal").tap("evaluate", () => true);
	parser.hooks.statement.tap("evaluate", (statement) => {
		results.push(`@${parser.getAttachedCommentsStart(statement)}`);
	});
	parser.hooks.collectDestructuringAssignmentProperties.tap(
		"evaluate",
		(expression) => expression.type === "CallExpression" || undefined
	);
	for (const key of KEYS) {
		parser.hooks.call.for(key).tap("evaluate", (expression) => {
			results.push(
				String(parser.isStatementLevelExpression(expression)),
				String(parser.isAsiPosition(/** @type {[number, number]} */ (expression.range)[0])),
				String((parser.state.guardStack || []).length)
			);
			for (const argument of expression.arguments) {
				results.push(
					String(
						parser.isPure(
							/** @type {import("estree").Expression} */ (argument),
							/** @type {[number, number]} */ (expression.range)[0]
						)
					)
				);
			}
			destructured(expression);
			for (const argument of expression.arguments) evaluate(argument);
		});
		parser.hooks.callMemberChain
			.for(key)
			.tap("evaluate", (expression, members) => {
				results.push(`${key}.${members}()`);
				for (const argument of expression.arguments) evaluate(argument);
			});
		parser.hooks.expressionMemberChain
			.for(key)
			.tap("evaluate", (expression, members) => {
				results.push(`${key}.${members}`);
			});
	}
	const state = strictOutput
		? { source, compilation: { runtimeTemplate: { isModule: () => true } } }
		: { source };
	parser.parse(
		preparsed ? preparsedAst(source) : source,
		/** @type {import("../../../lib/module/Parser").ParserState} */ (
			/** @type {unknown} */ (state)
		)
	);
	return results;
};

// expressions the evaluation reads by id, each passed to a tapped call
const SNIPPETS = [
	fixture("javascript", "walk-syntax-tree-snippets"),
	fixture("javascript", "walk-syntax-tree-snippets-2"),
	fixture("javascript", "walk-syntax-tree-snippets-3"),
	fixture("javascript", "walk-syntax-tree-snippets-4"),
	fixture("javascript", "walk-syntax-tree-snippets-5"),
	fixture("javascript", "walk-syntax-tree-snippets-6"),
	fixture("javascript", "walk-syntax-tree-snippets-7"),
	fixture("javascript", "walk-syntax-tree-snippets-8"),
	fixture("javascript", "walk-syntax-tree-snippets-9"),
	fixture("javascript", "walk-syntax-tree-snippets-10"),
	fixture("javascript", "walk-syntax-tree-snippets-11"),
	fixture("javascript", "walk-syntax-tree-snippets-12"),
	fixture("javascript", "walk-syntax-tree-snippets-13"),
	fixture("javascript", "walk-syntax-tree-snippets-14"),
	fixture("javascript", "walk-syntax-tree-snippets-15"),
	fixture("javascript", "walk-syntax-tree-snippets-16"),
	fixture("javascript", "walk-syntax-tree-snippets-17"),
	fixture("javascript", "walk-syntax-tree-snippets-18"),
	fixture("javascript", "walk-syntax-tree-snippets-19"),
	fixture("javascript", "walk-syntax-tree-snippets-20"),
	fixture("javascript", "walk-syntax-tree-snippets-21"),
	fixture("javascript", "walk-syntax-tree-snippets-22"),
	fixture("javascript", "walk-syntax-tree-snippets-23"),
	fixture("javascript", "walk-syntax-tree-snippets-24"),
	fixture("javascript", "walk-syntax-tree-snippets-25"),
	fixture("javascript", "walk-syntax-tree-snippets-26"),
	fixture("javascript", "walk-syntax-tree-snippets-27"),
	fixture("javascript", "walk-syntax-tree-snippets-28"),
	fixture("javascript", "walk-syntax-tree-snippets-29"),
	fixture("javascript", "walk-syntax-tree-snippets-30"),
	fixture("javascript", "walk-syntax-tree-snippets-31")
];

/**
 * @param {string} directory a directory under the repository
 * @returns {string[]} the `.js` files in it, recursively
 */
const filesIn = (directory) => {
	/** @type {string[]} */
	const files = [];
	for (const entry of fs.readdirSync(path.join(ROOT, directory), {
		withFileTypes: true
	})) {
		const file = path.join(directory, entry.name);
		if (entry.isDirectory()) files.push(...filesIn(file));
		else if (entry.name.endsWith(".js")) files.push(file);
	}
	return files;
};

describe("walk the syntax tree", () => {
	const files = [
		...filesIn("lib/javascript"),
		...filesIn("lib/dependencies"),
		...filesIn("test/cases/parsing")
	];

	it.each(files)("should call the same hooks for a preparsed AST of %s", (file) => {
		const source = fs.readFileSync(path.join(ROOT, file), "utf8");
		/** @type {string[] | Error} */
		let expected;
		try {
			expected = trace(source, false);
		} catch (err) {
			expected = /** @type {Error} */ (err);
		}
		if (expected instanceof Error) {
			expect(() => trace(source, true)).toThrow(expected.message);
			return;
		}
		expect(trace(source, true)).toEqual(expected);
	});

	it.each(
		[...files, ...SNIPPETS.map((_, i) => `snippet ${i}`)].flatMap((file) => [
			[file, false],
			[file, true]
		])
	)("should evaluate a preparsed AST of %s the same, strict output %s", (
		file,
		strictOutput
	) => {
		const source = file.startsWith("snippet ")
			? SNIPPETS[Number(file.slice(8))]
			: fs.readFileSync(path.join(ROOT, file), "utf8");
		/** @type {string[] | Error} */
		let expected;
		try {
			expected = evaluations(source, false, strictOutput);
		} catch (err) {
			expected = /** @type {Error} */ (err);
		}
		if (expected instanceof Error) {
			expect(() => evaluations(source, true, strictOutput)).toThrow(
				expected.message
			);
			return;
		}
		expect(evaluations(source, true, strictOutput)).toEqual(expected);
	});

	it.each(SNIPPETS.map((_, i) => i))(
		"should call the same hooks for a preparsed AST of snippet %i",
		(index) => {
			const source = SNIPPETS[index];
			expect(trace(source, true)).toEqual(trace(source, false));
		}
	);
});

describe("a syntax tree written from ESTree objects", () => {
	const { syntaxTreeOfEstree } = require("../../../lib/javascript/syntax-parser");
	const acorn = require("acorn");

	it("serves each node's object until the tree is released", () => {
		const program = /** @type {import("estree").Program} */ (
			/** @type {unknown} */ (
				acorn.parse(fixture("javascript", "a-syntax-tree-written-from-es-tree-objects-serves-each-node-s-object-until-the"), { ecmaVersion: "latest", ranges: true })
			)
		);
		const call = /** @type {import("estree").CallExpression} */ (
			/** @type {import("estree").ExpressionStatement} */ (program.body[0])
				.expression
		);
		const { tree, program: node } = syntaxTreeOfEstree(program, "f(a, [b]);");
		expect(tree.estree(node)).toBe(program);
		const id = tree.nodeOf(call);
		expect(id).not.toBe(0);
		expect(tree.estree(id)).toBe(call);
		// lazy objects read the same objects back
		const lazy = /** @type {import("estree").Program} */ (tree.lazyEstree(node));
		expect(lazy).toBe(program);
		tree.release();
		expect(tree.nodeOf(call)).toBe(0);
	});

	it("writes a subtree nested deeper than the compiled writer recurses", () => {
		const depth = 1500;
		const source = `${"[".repeat(depth)}x${"]".repeat(depth)};`;
		/** @type {import("estree").Identifier & { range: [number, number] }} */
		const deepest = { type: "Identifier", name: "x", range: [depth, depth + 1] };
		/** @type {import("estree").Expression & { range: [number, number] }} */
		let expression = deepest;
		for (let level = depth - 1; level >= 0; level--) {
			expression = {
				type: "ArrayExpression",
				elements: [expression],
				range: [level, source.length - 1 - level]
			};
		}
		/** @type {import("estree").Program & { range: [number, number] }} */
		const program = {
			type: "Program",
			sourceType: "script",
			body: [
				{
					type: "ExpressionStatement",
					expression,
					range: [0, source.length]
				}
			],
			range: [0, source.length]
		};
		const { tree } = syntaxTreeOfEstree(program, source);
		const id = tree.nodeOf(deepest);
		expect(id).not.toBe(0);
		expect(tree.estree(id)).toBe(deepest);
		tree.release();
	});

	it("skips a node type it has no layout for in a deep subtree", () => {
		const depth = 1500;
		/** @type {import("estree").Expression & { range: [number, number] }} */
		let expression =
			/** @type {import("estree").Expression & { range: [number, number] }} */ (
				/** @type {unknown} */ ({ type: "JSXElement", range: [depth, depth + 1] })
			);
		for (let level = depth - 1; level >= 0; level--) {
			expression = {
				type: "UnaryExpression",
				operator: "!",
				prefix: true,
				argument: expression,
				range: [level, depth + 1]
			};
		}
		const { tree, program } = syntaxTreeOfEstree(
			{
				type: "ExpressionStatement",
				expression,
				range: [0, depth + 2]
			},
			""
		);
		expect(program).not.toBe(0);
		tree.release();
		const {
			_SyntaxTree: SyntaxTree
		} = require("../../../lib/javascript/syntax-parser");

		const strict = new SyntaxTree();
		// without skipping, the type the tree lacks is an error
		expect(() => strict.addEstree(expression, "", false)).toThrow(
			"Unknown node type JSXElement"
		);
		strict.release();
	});
});

describe("a hook with path taps", () => {
	/**
	 * @param {JavascriptParser} parser the parser
	 * @param {string} source the module
	 * @returns {void}
	 */
	const parse = (parser, source) => {
		parser.parse(
			source,
			/** @type {import("../../../lib/module/Parser").ParserState} */ ({
				source
			})
		);
	};

	it("gives a path tap ids from a node object, outside a parse and through an interceptor", () => {
		const parser = new JavascriptParser("module");
		/** @type {string[]} */
		const seen = [];
		parser.hooks.statement.tap(
			{ name: "path", path: true },
			(/** @type {JavascriptNodeReader} */ reader, /** @type {number} */ id) => {
				seen.push(`path ${reader.range(id)}`);
			}
		);
		parser.hooks.statement.tap("object", (statement) => {
			seen.push(`object ${statement.type}`);
		});
		parse(parser, fixture("javascript", "a-hook-with-path-taps-gives-a-path-tap-ids-from-a-node-object-outside-a-parse"));
		expect(seen).toEqual([
			"path 0,2",
			"object ExpressionStatement",
			"path 3,5",
			"object ExpressionStatement"
		]);

		seen.length = 0;
		/** @type {import("estree").ExpressionStatement} */
		const statement = {
			type: "ExpressionStatement",
			expression: { type: "Identifier", name: "c", range: [0, 1] },
			range: [0, 2]
		};
		parser.hooks.statement.call(statement);
		expect(seen).toEqual(["path 0,2", "object ExpressionStatement"]);

		seen.length = 0;
		let calls = 0;
		parser.hooks.statement.intercept({
			call: () => {
				calls++;
			}
		});
		parse(parser, fixture("javascript", "a-hook-with-path-taps-gives-a-path-tap-ids-from-a-node-object-outside-a-parse-2"));
		expect(calls).toBe(1);
		expect(seen).toEqual(["path 0,2", "object ExpressionStatement"]);
	});

	it("hands an isPure tap the node object it was asked about outside a parse", () => {
		const parser = new JavascriptParser("module");
		/** @type {string[]} */
		const seen = [];
		parser.hooks.isPure.for("Literal").tap("object", (expression) => {
			seen.push(`${expression.type} ${/** @type {import("estree").Literal} */ (expression).value}`);
			return false;
		});
		parser.hooks.isPure.for("CallExpression").tap("object", (expression) => {
			seen.push(expression.type);
			return true;
		});
		/** @type {import("estree").Literal} */
		const literal = { type: "Literal", value: 1, raw: "1", range: [0, 1] };
		expect(parser.isPure(literal, 0)).toBe(false);
		/** @type {import("estree").CallExpression} */
		const call = {
			type: "CallExpression",
			callee: { type: "Identifier", name: "f", range: [0, 1] },
			arguments: [],
			optional: false,
			range: [0, 3]
		};
		expect(parser.isPure(call, 0)).toBe(true);
		expect(seen).toEqual(["Literal 1", "CallExpression"]);
	});
});

describe("a syntax tree node retyped with an empty record", () => {
	const {
		_SyntaxTree: SyntaxTree,
		NodeType
	} = require("../../../lib/javascript/syntax-parser");

	it("keeps its id and reads as the new type, its fields empty until set", () => {
		const tree = new SyntaxTree();
		const test = tree.addValueNode(NodeType.Identifier, 6, 7, "t");
		const body = tree.add(NodeType.EmptyStatement, 9, 10);
		const loop = tree.add(NodeType.WhileStatement, 0, 10);
		tree.set(loop, "test", test);
		tree.set(loop, "body", body);
		// Retype until the slot column is full: the next retype grows it.
		while (tree._slotTop + 4 <= tree._slots.length) {
			tree.setTypeEmpty(loop, NodeType.ForStatement);
		}
		const capacity = tree._slots.length;
		tree.setTypeEmpty(loop, NodeType.ForStatement);
		expect(tree._slots.length).toBeGreaterThan(capacity);
		tree.set(loop, "test", test);
		tree.set(loop, "body", body);
		expect(tree.estreeObject(loop)).toMatchObject({
			type: "ForStatement",
			init: null,
			test: { type: "Identifier", name: "t" },
			update: null,
			body: { type: "EmptyStatement" }
		});
	});
});
