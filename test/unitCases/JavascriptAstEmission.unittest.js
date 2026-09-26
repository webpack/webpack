"use strict";

const acorn = require("acorn");
const { WebpackParser } = require("../../lib/javascript/syntax-parser");
const JavascriptParser = require("../../lib/javascript/JavascriptParser");

/**
 * @param {string} source source code
 * @returns {EXPECTED_ANY} parsed program
 */
const parse = (source) =>
	JavascriptParser._parse(source, {
		sourceType: "script",
		locations: false,
		ranges: true
	}).ast;

describe("JavaScript AST emission compatibility", () => {
	it.each([undefined, 0])(
		"isolates identifier emission during nested parses (startPos=%s)",
		(startPos) => {
			const options = {
				ecmaVersion: /** @type {const} */ ("latest"),
				sourceType: /** @type {const} */ ("script"),
				lazyNodes: true
			};
			const source =
				"const { value = fallback } = object; ({ value }); class Example { async method(arg) { return arg.field; } }";
			const parser = new WebpackParser(options, source, startPos);
			const context = parser._astEmission;
			const emit = context.emitIdentifier;
			const emitted = new Set();
			/** @type {EXPECTED_ANY} */
			let nestedIdentifier;
			context.emitIdentifier = function (start, end, name) {
				if (nestedIdentifier === undefined) {
					const nested = new WebpackParser(options, "nested;", startPos);
					expect(nested._astEmission).not.toBe(context);
					nestedIdentifier = nested.parse().body[0].expression;
				}
				const node = emit.call(this, start, end, name);
				emitted.add(node);
				return node;
			};
			const ast = parser.parse();
			const visited = new Set();
			/** @param {EXPECTED_ANY} value a node or child list */
			const visit = (value) => {
				if (!value || typeof value !== "object" || visited.has(value)) return;
				visited.add(value);
				if (value.type === "Identifier") expect(emitted.has(value)).toBe(true);
				for (const child of Object.values(value)) visit(child);
			};
			visit(ast);
			expect(emitted.size).toBeGreaterThan(10);
			for (const node of emitted) expect(visited.has(node)).toBe(true);
			expect(emitted.has(nestedIdentifier)).toBe(false);
			expect(nestedIdentifier.name).toBe("nested");
			const key = ast.body[0].declarations[0].id.properties[0].key;
			key.name = "retained";
			new WebpackParser(options, source, startPos).parse();
			expect(ast.body[0].declarations[0].id.properties[0].key).toBe(key);
			expect(key.name).toBe("retained");
			expect(nestedIdentifier.name).toBe("nested");
		}
	);

	it("preserves own fields, child identities, mutations and lazy ranges", () => {
		const member = parse("object[42];").body[0].expression;
		const identifier = member.object;
		const literal = member.property;
		expect(Object.keys(identifier)).toEqual(["type", "start", "end", "name"]);
		expect(Object.keys(literal)).toEqual([
			"type",
			"start",
			"end",
			"value",
			"raw"
		]);
		expect(Object.keys(member)).toEqual([
			"type",
			"start",
			"end",
			"object",
			"property",
			"computed",
			"optional"
		]);
		expect({ ...member }.object).toBe(identifier);
		expect({ ...member }.property).toBe(literal);
		expect(JSON.parse(JSON.stringify(member)).property.value).toBe(42);
		for (const node of [identifier, literal, member]) {
			const keys = Object.keys(node);
			expect(node.range).toEqual([node.start, node.end]);
			expect(node.range).toBe(node.range);
			expect(Object.keys(node)).toEqual(keys);
			const range = [1, 2];
			node.range = range;
			expect(node.range).toBe(range);
		}
		identifier.name = "changed";
		literal.value = 7;
		expect(member.object.name).toBe("changed");
		expect(member.property.value).toBe(7);
		member.property = identifier;
		expect(member.property).toBe(member.object);
		parse("other[false];");
		expect(member.object).toBe(identifier);
		expect(identifier.name).toBe("changed");
	});

	it("keeps shorthand keys and values distinct when allocating identifiers", () => {
		for (const source of ["({ value });", "const { value = 1 } = object;"]) {
			const statement = parse(source).body[0];
			const object = statement.expression || statement.declarations[0].id;
			const property = object.properties[0];
			const value = property.value.left || property.value;
			expect(property.key).not.toBe(value);
			expect(property.key.name).toBe(value.name);
			value.name = "changed";
			expect(property.key.name).toBe("value");
		}
	});

	it("preserves literal payloads and member flags", () => {
		const expressions = parse(
			"true; false; null; 1_000; 12n; /x/gi; object?.[key];"
		).body.map((/** @type {EXPECTED_ANY} */ node) => node.expression);
		expect(
			expressions
				.slice(0, 4)
				.map((/** @type {EXPECTED_ANY} */ node) => node.value)
		).toEqual([true, false, null, 1000]);
		expect(expressions[3].raw).toBe("1_000");
		expect(expressions[4].bigint).toBe("12");
		expect(expressions[5].regex).toEqual({ pattern: "x", flags: "gi" });
		expect(expressions[6].expression).toMatchObject({
			type: "MemberExpression",
			computed: true,
			optional: true
		});
	});

	it("shares node identities and mutations across parser hooks", () => {
		const parser = new JavascriptParser("script");
		/** @type {EXPECTED_ANY[]} */
		const retained = [];
		/** @type {WeakMap<object, string>} */
		const metadata = new WeakMap();
		/** @type {string[]} */
		const events = [];
		parser.hooks.program.tap("identity", (program) => {
			const statement = program.body[0];
			if (statement.type !== "ExpressionStatement")
				throw new Error("Expected expression");
			const member = statement.expression;
			retained.push(member);
			metadata.set(member, "from program");
			events.push("program");
		});
		parser.hooks.statement.tap("identity", (statement) => {
			if (statement.type !== "ExpressionStatement")
				throw new Error("Expected expression");
			const member = statement.expression;
			expect(member).toBe(retained[retained.length - 1]);
			expect(metadata.get(member)).toBe("from program");
			if (
				member.type !== "MemberExpression" ||
				member.property.type !== "Identifier"
			) {
				throw new Error("Expected named member");
			}
			member.property.name = "changed";
			events.push("statement");
		});
		parser.hooks.expression.for("object.changed").tap("identity", (member) => {
			expect(member).toBe(retained[retained.length - 1]);
			expect(metadata.get(member)).toBe("from program");
			events.push("expression");
			return true;
		});
		for (const source of ["\nobject.field;", "object.field;"]) {
			parser.parse(source, /** @type {EXPECTED_ANY} */ ({}));
		}
		expect(events).toEqual([
			"program",
			"statement",
			"expression",
			"program",
			"statement",
			"expression"
		]);
		expect(retained[0]).not.toBe(retained[1]);
		expect(retained[0].object).not.toBe(retained[1].object);
		expect(retained[0].property.name).toBe("changed");
		expect(retained[0].start).toBe(1);
		expect(retained[1].start).toBe(0);
	});

	it("preserves explicit locations and derives the same locations for lazy nodes", () => {
		const source = "\r\nobject[\n  42\n];";
		/** @type {EXPECTED_ANY} */
		const expected = acorn.parse(source, {
			ecmaVersion: "latest",
			sourceType: "script",
			locations: true,
			ranges: true
		}).body[0];
		const mapper = new JavascriptParser("script");
		mapper._source = source;
		for (const locations of [false, true]) {
			/** @type {EXPECTED_ANY} */
			const ast = JavascriptParser._parse(source, {
				sourceType: "script",
				ranges: true,
				locations
			}).ast;
			const member = ast.body[0].expression;
			for (const [node, reference] of [
				[member, expected.expression],
				[member.object, expected.expression.object],
				[member.property, expected.expression.property]
			]) {
				expect(node.range).toEqual(reference.range);
				const location = {
					start: {
						line: reference.loc.start.line,
						column: reference.loc.start.column
					},
					end: {
						line: reference.loc.end.line,
						column: reference.loc.end.column
					}
				};
				expect(mapper.getLocation(node)).toMatchObject(location);
				if (locations) {
					expect(node.loc).toMatchObject(location);
					expect(Object.prototype.hasOwnProperty.call(node, "loc")).toBe(true);
					const saved = node.loc;
					expect(node.loc).toBe(saved);
					const column = saved.start.column;
					saved.start.column = 99;
					expect(node.loc.start.column).toBe(99);
					saved.start.column = column;
				} else {
					expect(node.loc).toBeUndefined();
				}
			}
		}
	});

	it.each([false, true])(
		"preserves production override identities with lazyNodes=%s",
		(lazyNodes) => {
			const emitted = new Set();
			class Plugin extends WebpackParser {
				/**
				 * @param {boolean} liberal allow keywords
				 * @returns {EXPECTED_ANY} identifier carrying plugin state
				 */
				parseIdent(liberal) {
					const node = super.parseIdent(liberal);
					node.pluginState = {};
					emitted.add(node);
					return node;
				}
				/**
				 * @param {EXPECTED_ANY} value literal value
				 * @returns {EXPECTED_ANY} literal carrying plugin state
				 */
				parseLiteral(value) {
					const node = super.parseLiteral(value);
					node.pluginState = {};
					emitted.add(node);
					return node;
				}
			}
			/** @type {Partial<import("../../lib/javascript/syntax-parser").ParserOptions>} */
			const options = {
				ecmaVersion: /** @type {const} */ ("latest"),
				sourceType: /** @type {const} */ ("script"),
				lazyNodes,
				ranges: true
			};
			/** @type {EXPECTED_ANY} */
			const ast = Plugin.parse("object[42].field;", options);
			const member = ast.body[0].expression;
			expect(emitted.size).toBe(3);
			for (const node of [
				member.property,
				member.object.object,
				member.object.property
			]) {
				expect(emitted.has(node)).toBe(true);
				expect(node.pluginState).toEqual({});
			}
		}
	);
});
