"use strict";

const { SourceProcessor } = require("../../../lib/javascript/syntax");
const {
	A,
	Field,
	Flag,
	NodeType,
	Part,
	parseProgram
} = require("../../../lib/javascript/syntax-parser");

/** @typedef {import("../../../lib/javascript/syntax-parser").JavascriptPath} JavascriptPath */
/** @typedef {import("../../../lib/util/SourceProcessor").AnyParts} AnyParts */
/** @typedef {import("../../../lib/util/SourceProcessor").TypedNodePath<JavascriptPath, number, AnyParts, number>} VisitorPath */
/** @typedef {import("../../../lib/javascript/syntax-parser").TreeValue} TreeValue */
/**
 * @template TNode
 * @template TValue
 * @typedef {import("../../../lib/util/SourceProcessor").NodePathEdits<TNode, TValue>} NodePathEdits
 */

// The JavaScript path is held to the members every editing path shares.
/** @type {NodePathEdits<number, TreeValue>} */
const editingPath = A;
/** @typedef {import("../../../lib/javascript/syntax-parser").JavascriptSourceType} JavascriptSourceType */

/**
 * Prints a source after visitors edit it, as ECMAScript 2020 prints it, and
 * checks the output parses as the source did.
 * @param {string} source the source
 * @param {number[]} types the node types the visitor visits
 * @param {((path: VisitorPath) => void) | { enter?: (path: VisitorPath) => void, exit?: (path: VisitorPath) => void }} visitor the visitor
 * @param {JavascriptSourceType=} sourceType what the source is read as
 * @returns {string} the printed text
 */
const edited = (source, types, visitor, sourceType = "module") => {
	const { code } = /** @type {{ code: string }} */ (
		new SourceProcessor()
			.use(types, visitor)
			.process(source, { mode: "minify", sourceType, format: { ecma: 2020 } })
	);
	expect(parseProgram(code, 0, { sourceType })).toBeGreaterThan(0);
	return code;
};

/**
 * @param {VisitorPath} path the path
 * @param {string} name a name
 * @returns {boolean} whether the current node is an identifier of that name
 */
const named = (path, name) =>
	path.type() === NodeType.Identifier && path.name() === name;

describe("JavaScript node path edits", () => {
	describe("text parsed for the field it goes in", () => {
		it.each([
			[
				"a statement",
				"a;b;",
				(/** @type {VisitorPath} */ path) => {
					if (named(path, "a")) path.insert("after", "c()", /** @type {number} */ (path.parent));
				},
				"a;c();b;"
			],
			[
				"an expression, parenthesized as it is printed",
				"x=2*y;",
				(/** @type {VisitorPath} */ path) => {
					if (named(path, "y")) path.replaceWith("a + b");
				},
				"x=2*(a+b);"
			],
			[
				"arguments, a spread among them",
				"f(a);",
				(/** @type {VisitorPath} */ path) => {
					if (named(path, "a")) path.insert("after", "...b, c");
				},
				"f(a,...b,c);"
			],
			[
				"an array's holes",
				"[a];",
				(/** @type {VisitorPath} */ path) => {
					if (named(path, "a")) path.insert("after", ", b");
				},
				"[a,,b];"
			],
			[
				"a function's body",
				"function f(){a}",
				(/** @type {VisitorPath} */ path) => {
					// A replacement is visited too, and is written nowhere in the input.
					if (path.type() === NodeType.BlockStatement && path.source() !== "") {
						path.replaceWith("{return 1}");
					}
				},
				"function f(){return 1}"
			],
			[
				"an arrow's body, a block",
				"(()=>a);",
				(/** @type {VisitorPath} */ path) => {
					if (named(path, "a")) path.replaceWith("{}");
				},
				"()=>{};"
			],
			[
				"a function's parameters",
				"function f(a){}",
				(/** @type {VisitorPath} */ path) => {
					if (named(path, "a")) path.insert("after", "b = 1, ...c");
				},
				"function f(a,b=1,...c){}"
			],
			[
				"a binding pattern",
				"var [a] = d;",
				(/** @type {VisitorPath} */ path) => {
					if (named(path, "a")) path.insert("after", "{ b }");
				},
				"var[a,{b}]=d;"
			],
			[
				"an assignment pattern, which a member stands in",
				"[a] = d;",
				(/** @type {VisitorPath} */ path) => {
					if (named(path, "a")) path.insert("after", "e.f");
				},
				"[a,e.f]=d;"
			],
			[
				"a binding object pattern",
				"var {a} = d;",
				(/** @type {VisitorPath} */ path) => {
					if (path.type() === NodeType.ObjectPattern) {
						path.insert(Field.properties, "b, ...c");
					}
				},
				"var{a,b,...c}=d;"
			],
			[
				"an assigned object pattern",
				"({a} = d);",
				(/** @type {VisitorPath} */ path) => {
					if (path.type() === NodeType.ObjectPattern) {
						path.insert(Field.properties, "b: e.f");
					}
				},
				"({a,b:e.f}=d);"
			],
			[
				"an object's properties",
				"({a});",
				(/** @type {VisitorPath} */ path) => {
					if (path.type() === NodeType.ObjectExpression) {
						path.insert(Field.properties, "b: 1, ...c");
					}
				},
				"({a,b:1,...c});"
			],
			[
				"a class's members, a private one among them",
				"class A{}",
				(/** @type {VisitorPath} */ path) => {
					if (path.type() === NodeType.ClassBody) {
						path.insert(Field.body, "#x = 1; static { this.#x; }");
					}
				},
				"class A{#x=1;static{this.#x}}"
			],
			[
				"a switch's cases",
				"switch(a){case 1:}",
				(/** @type {VisitorPath} */ path) => {
					if (path.type() === NodeType.SwitchStatement) {
						path.insert(Field.cases, "default: b()");
					}
				},
				"switch(a){case 1:default:b()}"
			],
			[
				"a declaration's declarators",
				"let a;",
				(/** @type {VisitorPath} */ path) => {
					if (path.type() === NodeType.VariableDeclaration) {
						path.insert(Field.declarations, "b = 2");
					}
				},
				"let a,b=2;"
			],
			[
				"a for loop's head",
				"for(;;);",
				(/** @type {VisitorPath} */ path) => {
					if (path.type() === NodeType.ForStatement) {
						path.insert(Field.init, "let i = 0");
					}
				},
				"for(let i=0;;);"
			],
			[
				"a for…of loop's left side",
				"for(a of b);",
				(/** @type {VisitorPath} */ path) => {
					if (named(path, "a")) path.replaceWith("const c");
				},
				"for(const c of b);"
			],
			[
				"a catch clause",
				"try{}finally{}",
				(/** @type {VisitorPath} */ path) => {
					if (path.type() === NodeType.TryStatement) {
						path.insert(Field.handler, "catch{}");
					}
				},
				"try{}catch{}finally{}"
			],
			[
				"import specifiers, named and default",
				'import "x";',
				(/** @type {VisitorPath} */ path) => {
					if (path.type() === NodeType.ImportDeclaration) {
						path.insert(Field.specifiers, "d");
					}
				},
				'import d from"x";'
			],
			[
				"a named import specifier",
				'import {a} from "x";',
				(/** @type {VisitorPath} */ path) => {
					if (path.type() === NodeType.ImportDeclaration) {
						path.insert(Field.specifiers, '"b-c" as b');
					}
				},
				'import{a,"b-c"as b}from"x";'
			],
			[
				"import attributes",
				'import a from "x";',
				(/** @type {VisitorPath} */ path) => {
					if (path.type() === NodeType.ImportDeclaration) {
						path.insert(Field.attributes, 'type: "json"');
					}
				},
				'import a from"x"with{type:"json"};'
			],
			[
				"a module's name",
				'import a from "x";',
				(/** @type {VisitorPath} */ path) => {
					if (path.type() === NodeType.Literal && path.source() !== "") {
						path.replaceWith('"y"');
					}
				},
				'import a from"y";'
			],
			[
				"export specifiers",
				'export {} from "x";',
				(/** @type {VisitorPath} */ path) => {
					if (path.type() === NodeType.ExportNamedDeclaration) {
						path.insert(Field.specifiers, "default as b");
					}
				},
				'export{default as b}from"x";'
			],
			[
				"an exported declaration",
				"export const a = 1;",
				(/** @type {VisitorPath} */ path) => {
					if (path.type() === NodeType.VariableDeclaration) {
						path.replaceWith("function f(){}");
					}
				},
				"export function f(){}"
			],
			[
				"a default export",
				"export default 1;",
				(/** @type {VisitorPath} */ path) => {
					if (path.type() === NodeType.Literal) {
						path.replaceWith("class {}");
					}
				},
				"export default class{}"
			],
			[
				"a tagged template's template",
				"t`a`;",
				(/** @type {VisitorPath} */ path) => {
					if (path.type() === NodeType.TemplateLiteral && path.source() !== "") {
						path.replaceWith("`b${c}`");
					}
				},
				"t`b${c}`;"
			],
			[
				"a label",
				"a:for(;;)break a;",
				(/** @type {VisitorPath} */ path) => {
					if (path.type() === NodeType.BreakStatement) {
						path.replaceWith("continue a");
					}
				},
				"a:for(;;)continue a;"
			]
		])("should read %s", (_name, source, visitor, expected) => {
			expect(
				edited(source, Object.values(NodeType), /** @type {(path: VisitorPath) => void} */ (visitor))
			).toBe(expected);
		});

		it("should read a function's body as its kind does", () => {
			expect(
				edited("async function*f(){a}", [NodeType.Identifier], (path) => {
					if (named(path, "a")) path.replaceWith("await (yield b)");
				})
			).toBe("async function*f(){await(yield b)}");
			expect(
				edited("class A extends B{constructor(){a}m(){a}}", [NodeType.Identifier], (path) => {
					if (named(path, "a")) path.replaceWith("super.m()");
				})
			).toBe("class A extends B{constructor(){super.m()}m(){super.m()}}");
			expect(
				edited("({get m(){a}});", [NodeType.Identifier], (path) => {
					if (named(path, "a")) path.replaceWith("super.x");
				})
			).toBe("({get m(){super.x}});");
			expect(
				edited("a;", [NodeType.ExpressionStatement], (path) => {
					if (path.source() === "a;") path.insert("after", "return");
				}, "commonjs")
			).toBe("a;return;");
		});

		it("should read a jump as the loops, switches and labels around it do", () => {
			/**
			 * @param {string} source the source
			 * @param {string} jump the statement standing in for `x`
			 * @returns {string} the printed text
			 */
			const jumped = (source, jump) =>
				edited(source, [NodeType.ExpressionStatement], (path) => {
					if (path.source() === "x;") path.replaceWith(jump);
				});
			expect(jumped("a:{for(;;){x;}}", "break a")).toBe("a:{for(;;){break a}}");
			expect(jumped("a:b:for(;;){x;}", "continue a")).toBe(
				"a:b:for(;;){continue a}"
			);
			expect(jumped("switch(0){case 1:x;}", "break")).toBe(
				"switch(0){case 1:break}"
			);
			expect(() => jumped("a:{x;}", "continue a")).toThrow(/does not read/);
			expect(
				edited(
					"function f(){x}",
					[NodeType.Identifier],
					(path) => {
						if (named(path, "x")) path.replaceWith("new.target");
					},
					"commonjs"
				)
			).toBe("function f(){new.target}");
			expect(
				edited(
					'"a";',
					[NodeType.ExpressionStatement],
					(path) => {
						if (path.source() !== "") path.insert("after", "with(b);");
					},
					"script"
				)
			).toBe('"a";with(b);');
		});

		it("should read text as strict where the code around it is", () => {
			/**
			 * @param {string} source a script
			 * @param {string} text the statement to put after `a;`
			 * @returns {string} the printed text
			 */
			const after = (source, text) =>
				edited(
					source,
					[NodeType.ExpressionStatement],
					(path) => {
						if (path.source() === "a;") path.insert("after", text);
					},
					"script"
				);
			expect(() => after('function f(){"use strict";a;}', "with(b);")).toThrow(
				/does not read/
			);
			expect(() => after("class A{m(){a;}}", "with(b);")).toThrow(
				/does not read/
			);
			expect(() =>
				after('"use strict";function f(){a;}', "with(b);")
			).toThrow(/does not read/);
			expect(after('function f(){"use strict";a;}', "b;")).toBe(
				'function f(){"use strict";a;b}'
			);
			expect(after('"use strict";a;', "b;")).toBe('"use strict";a;b;');
			expect(() => after("class A{static{a;}}", "with(b);")).toThrow(
				/does not read/
			);
			expect(() =>
				edited(
					"class A{x=a}",
					[NodeType.Identifier],
					(path) => {
						if (named(path, "a")) path.replaceWith("010");
					},
					"script"
				)
			).toThrow(/does not read/);
		});

		it("should refuse text that does not read there", () => {
			expect(() =>
				edited("function f(){a}", [NodeType.Identifier], (path) => {
					if (named(path, "a")) path.replaceWith("await b");
				})
			).toThrow(/"await b" does not read as an ExpressionStatement's expression/);
			expect(() =>
				edited('"use strict";a;', [NodeType.Identifier], (path) => {
					path.insert("after", "with(b);", /** @type {number} */ (path.parent));
				}, "script")
			).toThrow(/does not read/);
			expect(() =>
				edited("var [a] = d;", [NodeType.Identifier], (path) => {
					if (named(path, "a")) path.insert("after", "e.f");
				})
			).toThrow(/does not read as an ArrayPattern's elements/);
			expect(() =>
				edited("`a${b}`;", [NodeType.TemplateLiteral], (path) => {
					path.insert(Field.quasis, "c");
				})
			).toThrow("a TemplateLiteral's quasis takes no text");
		});

		it("should refuse a node the field does not hold", () => {
			expect(() =>
				edited("if(a);", [NodeType.IfStatement], (path) => {
					path.replaceWith("...b", path.field(0, Field.test));
				})
			).toThrow(/does not read|holds no SpreadElement/);
			expect(() =>
				edited('import a from "x";', [NodeType.Literal], (path) => {
					path.replaceWith("1");
				})
			).toThrow("an ImportDeclaration's source holds a string");
			expect(() =>
				edited("export {};", [NodeType.ExportNamedDeclaration], (path) => {
					path.insert(Field.specifiers, "default as b");
				})
			).toThrow('an export with no source exports a binding, not "default"');
			expect(() =>
				edited('export {default} from "x";', [NodeType.Literal], (path) => {
					path.remove();
				})
			).toThrow('an export with no source exports a binding, not "default"');
			expect(() =>
				edited("if(a);", [NodeType.IfStatement], (path) => {
					path.replaceWith([0], path.field(0, Field.test));
				})
			).toThrow("an IfStatement's test holds no hole");
		});
	});

	describe("replaceWith, insert and remove", () => {
		it("should remove a statement and an optional field", () => {
			expect(
				edited("console.log(1);a();", [NodeType.Identifier], (path) => {
					if (named(path, "console")) path.remove(path.ancestor(2));
				})
			).toBe("a();");
			expect(
				edited("if(a)b;else c;", [NodeType.IfStatement], (path) => {
					path.remove(path.field(0, Field.alternate));
				})
			).toBe("if(a)b;");
		});

		it("should refuse to empty what must hold a node", () => {
			expect(() =>
				edited("f(a);", [NodeType.Identifier], (path) => {
					if (named(path, "f")) path.remove();
				})
			).toThrow("a CallExpression's callee cannot be empty");
			expect(() =>
				edited("(a, b);", [NodeType.SequenceExpression], (path) => {
					path.remove(path.field(1, Field.expressions));
					path.remove(path.field(0, Field.expressions));
				})
			).toThrow("a SequenceExpression's expressions cannot be empty");
			expect(() =>
				edited("`a${b}c`;", [NodeType.Identifier], (path) => {
					path.remove();
				})
			).toThrow(/one more quasi than expressions/);
			expect(() =>
				edited("const a = 1;", [NodeType.Literal], (path) => path.remove())
			).toThrow("a const declaration gives each declarator a value");
			expect(() =>
				edited("const a = 1;", [NodeType.VariableDeclaration], (path) =>
					path.insert(Field.declarations, "b")
				)
			).toThrow("a const declaration gives each declarator a value");
			expect(() =>
				edited("a;", [NodeType.Program], (path) => path.replaceWith("b"))
			).toThrow("the Program is in no field");
		});

		it("should replace with several nodes, or with none in a list", () => {
			expect(
				edited("a;b;", [NodeType.ExpressionStatement], (path) => {
					if (path.source() === "a;") path.replaceWith(["c;", "d;"]);
				})
			).toBe("c;d;b;");
			expect(
				edited("f(a,b);", [NodeType.Identifier], (path) => {
					if (named(path, "a")) path.replaceWith([]);
				})
			).toBe("f(b);");
			expect(() =>
				edited("if(a);", [NodeType.Identifier], (path) => {
					path.replaceWith("b, c");
				})
			).toThrow(/holds one node, not 2/);
		});

		it("should insert into a field only where it has room", () => {
			expect(() =>
				edited("if(a);", [NodeType.Identifier], (path) => {
					path.insert("after", "b");
				})
			).toThrow("an IfStatement's test holds one node; replace it instead");
			expect(() =>
				edited("if(a);", [NodeType.IfStatement], (path) => {
					path.insert(Field.test, "b");
				})
			).toThrow("an IfStatement's test holds a node already; replace it instead");
			expect(() =>
				edited("if(a);", [NodeType.IfStatement], (path) => {
					path.insert(Field.arguments, "b");
				})
			).toThrow("an IfStatement has no field arguments");
			expect(() =>
				edited("if(a);", [NodeType.IfStatement], (path) => {
					path.insert(/** @type {"before"} */ ("inside"), "b");
				})
			).toThrow('insert() takes "before", "after" or a Field, not inside');
			expect(
				edited("if(a)b;", [NodeType.IfStatement], (path) => {
					path.insert(Field.alternate, "c");
				})
			).toBe("if(a)b;else c;");
		});

		it("should move a node, leaving where it stood", () => {
			expect(
				edited("f(a,b);", [NodeType.CallExpression], (path) => {
					path.insert("before", path.field(1, Field.arguments), path.field(0, Field.arguments));
				})
			).toBe("f(b,a);");
			expect(
				edited("a;if(b)c;", [NodeType.IfStatement], (path) => {
					const consequent = path.field(0, Field.consequent);
					path.replaceWith(";", consequent);
					path.insert(Field.alternate, consequent);
				})
			).toBe("a;if(b);else c;");
		});

		it("should move a node out of a field that may be empty, or onto another's place", () => {
			expect(
				edited("if(a)b;else c;", [NodeType.IfStatement], (path) => {
					path.insert("after", path.field(0, Field.alternate));
				})
			).toBe("if(a)b;c;");
			expect(
				edited("f(a,b);", [NodeType.CallExpression], (path) => {
					path.replaceWith(path.field(1, Field.arguments), path.field(0, Field.arguments));
				})
			).toBe("f(b);");
			expect(
				edited("let a = 1;", [NodeType.VariableDeclarator], (path) => {
					path.replaceWith("[b]", path.field(0, Field.id));
				})
			).toBe("let[b]=1;");
		});

		it("should refuse a move that breaks the tree", () => {
			expect(() =>
				edited("f(g(a));h();", [NodeType.Identifier], (path) => {
					if (!named(path, "a")) return;
					const h = path.field(1, Field.body, path.ancestor(3));
					path.insert(Field.arguments, path.ancestor(0), path.field(0, Field.expression, h));
				})
			).toThrow("the walk is inside the CallExpression, which cannot move until it leaves it");
			expect(() =>
				edited("f(g(a));", [NodeType.CallExpression], (path) => {
					if (path.name(path.field(0, Field.callee)) === "f") {
						const inner = path.field(0, Field.arguments);
						path.insert(Field.arguments, path.node, inner);
					}
				})
			).toThrow("a CallExpression cannot be put inside itself");
			expect(() =>
				edited("f(a);g();", [NodeType.CallExpression], (path) => {
					if (path.name(path.field(0, Field.callee)) !== "f") return;
					const g = path.field(1, Field.body, path.ancestor(1));
					path.insert(Field.arguments, path.field(0, Field.callee), path.field(0, Field.expression, g));
				})
			).toThrow("moving the Identifier would leave a CallExpression's callee empty");
			expect(() =>
				edited("f();", [NodeType.CallExpression], (path) => {
					path.insert(Field.arguments, 999);
				})
			).toThrow("999 is no node");
			expect(() =>
				edited("f();", [NodeType.CallExpression], (path) => path.remove(0))
			).toThrow("0 is no node");
		});

		it("should place a parsed node where it was put, written nowhere", () => {
			/** @type {number[]} */
			const offsets = [];
			edited("f(a);", [NodeType.Identifier], (path) => {
				if (!named(path, "a")) return;
				const [b] = path.insert("after", "b");
				offsets.push(path.start(b), path.end(b), path.source(b).length);
				expect(path.name(b)).toBe("b");
			});
			expect(offsets).toEqual([3, 3, 0]);
		});
	});

	describe("the walk over an edited tree", () => {
		it("should visit every node an edit adds once, as Babel's walk does", () => {
			/** @type {string[]} */
			const seen = [];
			edited("a;b;", [NodeType.Identifier], (path) => {
				seen.push(path.name());
				if (named(path, "a")) path.insert("after", "c", /** @type {number} */ (path.parent));
				if (named(path, "b")) path.insert("before", "d", /** @type {number} */ (path.parent));
			});
			expect(seen).toEqual(["a", "c", "b", "d"]);
		});

		it("should visit a replacement, and leave what a visitor takes out", () => {
			/** @type {string[]} */
			const seen = [];
			expect(
				edited("f(a);g(h);", [NodeType.CallExpression, NodeType.Identifier], {
					enter(path) {
						if (path.type() === NodeType.Identifier) seen.push(path.name());
						if (named(path, "a")) path.replaceWith("x(y)");
						if (path.type() === NodeType.CallExpression && path.name(path.field(0, Field.callee)) === "g") {
							path.remove(/** @type {number} */ (path.parent));
						}
					},
					exit(path) {
						if (path.type() === NodeType.CallExpression) seen.push(`exit ${path.name(path.field(0, Field.callee))}`);
					}
				})
			).toBe("f(x(y));");
			expect(seen).toEqual(["f", "a", "x", "y", "exit x", "exit f"]);
		});

		it("should print nothing of a node its exit visitor takes out", () => {
			expect(
				edited("a;b;", [NodeType.ExpressionStatement], {
					exit: (path) => {
						if (path.source() === "a;") path.remove();
					}
				})
			).toBe("b;");
		});

		it("should end the walk where a visitor stops it after an edit", () => {
			/** @type {string[]} */
			const seen = [];
			new SourceProcessor()
				.use([NodeType.Identifier], (path) => {
					seen.push(path.name());
					if (named(path, "a")) {
						path.insert("after", "c", /** @type {number} */ (path.parent));
						path.stop();
					}
				})
				.process("a;b;");
			expect(seen).toEqual(["a"]);
		});

		it("should visit a moved node where it went, not where it was", () => {
			/** @type {string[]} */
			const seen = [];
			edited(
				"x = y; [z];",
				[NodeType.AssignmentExpression, NodeType.Identifier],
				(path) => {
					if (path.type() === NodeType.Identifier) {
						seen.push(path.name());
						return;
					}
					const array = path.field(
						0,
						Field.expression,
						path.field(1, Field.body, path.ancestor(1))
					);
					path.replaceWith(
						path.field(0, Field.elements, array),
						path.field(0, Field.left)
					);
				}
			);
			expect(seen).toEqual(["z", "y"]);
		});

		it("should print what an exit visitor adds to its own node", () => {
			expect(
				edited("f(a);", [NodeType.CallExpression], {
					exit: (path) => {
						path.insert(Field.arguments, "z");
					}
				})
			).toBe("f(a,z);");
		});

		it("should refuse an edit to a node already printed", () => {
			expect(() =>
				edited("f(g(a));", [NodeType.CallExpression], {
					exit: (path) => {
						if (path.name(path.field(0, Field.callee)) === "f") {
							path.insert(Field.arguments, "z", path.field(0, Field.arguments));
						}
					}
				})
			).toThrow("a CallExpression the walk printed already can no longer be edited");
		});

		it("should visit, on a walk that prints nothing, what is added behind it", () => {
			/** @type {string[]} */
			const seen = [];
			new SourceProcessor()
				.use([NodeType.CallExpression], {
					exit: (path) => {
						if (path.name(path.field(0, Field.callee)) === "f") {
							path.insert(Field.arguments, "late", path.field(0, Field.arguments));
						}
					}
				})
				.use([NodeType.Identifier], (path) => {
					seen.push(`${path.name()}<${path.type(/** @type {number} */ (path.parent))}`);
				})
				.process("f(g(a));");
			expect(seen).toEqual([
				`f<${NodeType.CallExpression}`,
				`g<${NodeType.CallExpression}`,
				`a<${NodeType.CallExpression}`,
				`late<${NodeType.CallExpression}`
			]);
		});

		it("should edit only during a walk", () => {
			expect(parseProgram("a;")).toBeGreaterThan(0);
			expect(() => editingPath.setName("b", 1)).toThrow(
				"javascript syntax: path.setName() edits only a tree a SourceProcessor run walks"
			);
			expect(() =>
				edited("f(a);", [NodeType.Identifier], (path) => {
					if (!named(path, "a")) return;
					const a = path.node;
					path.remove();
					path.replaceWith("b", a);
				})
			).toThrow("the Identifier is not in the tree");
		});
	});

	describe("setName", () => {
		it("should rename a reference, a key and a private name", () => {
			expect(
				edited("a.b;({c:1});class A{#d;m(){this.#d}}", [NodeType.Identifier, NodeType.PrivateIdentifier], (path) => {
					if (path.type() === NodeType.PrivateIdentifier) path.setName("e");
					else if (path.name() === "b") path.setName("class");
					else if (path.name() === "c") path.setName("if");
					else if (path.name() === "a") path.setName("$x");
				})
			).toBe("$x.class;({if:1});class A{#e;m(){this.#e}}");
		});

		it("should write a shorthand property out where its names part", () => {
			expect(
				edited("({a});({b=1}=c);", [NodeType.Identifier], (path) => {
					if (path.parent !== null && path.type(path.parent) === NodeType.AssignmentPattern && path.name() === "b") path.setName("d");
					if (path.name() === "a" && path.index === 1) path.setName("e");
				})
			).toBe("({a:e});({b:d=1}=c);");
		});

		it("should rename a re-exported name to any identifier name", () => {
			expect(
				edited('export {a as b} from "x";', [NodeType.Identifier], (path) => {
					if (path.name() === "a") path.setName("default");
				})
			).toBe('export{default as b}from"x";');
		});

		it("should refuse a name that does not read there", () => {
			expect(() =>
				edited("x;", [NodeType.Identifier], (path) => path.setName("class"))
			).toThrow(/"class" cannot name an ExpressionStatement's expression/);
			expect(() =>
				edited("x;", [NodeType.Identifier], (path) => path.setName("a-b"))
			).toThrow('"a-b" is no identifier name');
			expect(() =>
				edited("x;", [NodeType.Identifier], (path) => path.setName(""))
			).toThrow('"" is no identifier name');
			expect(() =>
				edited("x;", [NodeType.ExpressionStatement], (path) => path.setName("y"))
			).toThrow("an ExpressionStatement has no name");
			expect(() =>
				edited("function f(){new.target}", [NodeType.Identifier], (path) => {
					if (path.name() === "target") path.setName("x");
				})
			).toThrow("a MetaProperty's names are its syntax; replace it instead");
		});
	});

	describe("setValue", () => {
		it.each([
			["a string", "dev", '"prod";', "prod"],
			["a number", "dev", "1.5;", 1.5],
			["a bigint", "dev", "10n;", BigInt(10)],
			["a boolean", "dev", "false;", false],
			["null", "dev", "null;", null],
			["a regular expression", "dev", "/a/gi;", /a/gi]
		])("should write %s", (_name, _from, expected, value) => {
			expect(
				edited('x;"dev";', [NodeType.Literal], (path) => {
					path.setValue(/** @type {EXPECTED_ANY} */ (value));
					expect(path.value()).toEqual(value);
				})
			).toBe(`x;${expected}`);
		});

		it("should keep a directive's string a directive", () => {
			expect(
				edited('"use strict";a;', [NodeType.Literal], (path) => {
					path.setValue("use asm");
					expect(path.textOf(Part.directive, /** @type {number} */ (path.parent))).toBe("use asm");
				}, "script")
			).toBe('"use asm";a;');
			expect(() =>
				edited('"use strict";a;', [NodeType.Literal], (path) => path.setValue(1), "script")
			).toThrow("a directive's literal holds a string; replace its statement instead");
		});

		it("should refuse a value no literal holds", () => {
			expect(() =>
				edited("1;", [NodeType.Literal], (path) => path.setValue(-1))
			).toThrow("a Literal holds no -1; replace it with an expression");
			expect(() =>
				edited("1;", [NodeType.Literal], (path) => path.setValue(Number.NaN))
			).toThrow("a Literal holds no NaN");
			expect(() =>
				edited("1;", [NodeType.Literal], (path) => path.setValue(BigInt(-1)))
			).toThrow("a Literal holds no negative bigint");
			expect(() =>
				edited("1;", [NodeType.Literal], (path) =>
					path.setValue(/** @type {EXPECTED_ANY} */ (undefined))
				)
			).toThrow("a Literal holds no undefined");
			expect(() =>
				edited("x;", [NodeType.Identifier], (path) => path.setValue(1))
			).toThrow("an Identifier has no value");
		});

		it("should refuse a value the field holding the literal does not take", () => {
			expect(() =>
				edited('import a from "x";', [NodeType.Literal], (path) =>
					path.setValue(5)
				)
			).toThrow("an ImportDeclaration's source holds a string");
			expect(() =>
				edited('({"a":1});', [NodeType.Literal], (path) => {
					if (path.value() === "a") path.setValue(/a/);
				})
			).toThrow(
				"a key that is not computed is a string or a number, not /a/"
			);
			expect(
				edited('({"a":1});', [NodeType.Literal], (path) => {
					if (path.value() === "a") path.setValue(2);
				})
			).toBe("({2:1});");
		});

		it("should write a template element's text", () => {
			expect(
				edited("`a${b}c`;", [NodeType.TemplateElement], (path) => {
					if (path.index === 0) path.setValue("x`${y}\\");
					else path.setValue({ raw: "\\n", cooked: "\n" });
				})
			).toBe("`x\\`\\${y}\\\\${b}\\n`;");
			expect(() =>
				edited("`a`;", [NodeType.TemplateElement], (path) =>
					path.setValue({ raw: "\\n", cooked: "x" })
				)
			).toThrow('"\\\\n" cooks to "\\n"');
			expect(() =>
				edited("`a`;", [NodeType.TemplateElement], (path) =>
					path.setValue({ raw: "\\u", cooked: null })
				)
			).toThrow('"\\\\u" is no template text');
			expect(() =>
				edited("`a`;", [NodeType.TemplateElement], (path) => path.setValue(1))
			).toThrow("a TemplateElement's value is its text, or `{ raw, cooked }`");
		});
	});

	describe("setFlag", () => {
		it("should set and clear what the fields allow", () => {
			expect(
				edited(
					"a?.b.c;({d:1});x={e(){}};function*f(){yield g}a++;h={i:i};",
					[NodeType.MemberExpression, NodeType.Property, NodeType.YieldExpression, NodeType.UpdateExpression],
					(path) => {
						const type = path.type();
						if (type === NodeType.MemberExpression && path.name(path.field(0, Field.property)) === "c") {
							path.setFlag(Flag.optional, true);
						}
						if (type === NodeType.MemberExpression && path.name(path.field(0, Field.property)) === "b") {
							path.setFlag(Flag.computed, true);
						}
						if (type === NodeType.Property && path.name(path.field(0, Field.key)) === "e") {
							path.setFlag(Flag.method, false);
						}
						if (type === NodeType.Property && path.name(path.field(0, Field.key)) === "i") {
							path.setFlag(Flag.shorthand, true);
						}
						if (type === NodeType.YieldExpression) path.setFlag(Flag.delegate, true);
						if (type === NodeType.UpdateExpression) path.setFlag(Flag.prefix, true);
					}
				)
			).toBe("a?.[b]?.c;({d:1});x={e:function(){}};function*f(){yield*g}++a;h={i};");
		});

		it("should read a chain through the members and calls it opens", () => {
			expect(
				edited("a?.b.c.d;", [NodeType.MemberExpression], (path) => {
					if (path.name(path.field(0, Field.property)) === "c") {
						path.setFlag(Flag.optional, true);
					}
				})
			).toBe("a?.b?.c.d;");
		});

		it("should write shorthand where it reads, and leave a flag set as it is", () => {
			expect(
				edited("({a});({b:b=1}=c);x.y;", [NodeType.Property, NodeType.MemberExpression], (path) => {
					if (path.type() === NodeType.MemberExpression) {
						path.setFlag(Flag.computed, false);
						return;
					}
					path.setFlag(Flag.shorthand, !path.flag(Flag.shorthand));
				})
			).toBe("({a});({b=1}=c);x.y;");
		});

		it("should set a function's kind and a loop's await where they read", () => {
			expect(
				edited("function f(){}(()=>1);class A{static m(){}}for(a of b);", [NodeType.FunctionDeclaration, NodeType.ArrowFunctionExpression, NodeType.MethodDefinition, NodeType.ForOfStatement], (path) => {
					const type = path.type();
					if (type === NodeType.FunctionDeclaration) path.setFlag(Flag.generator, true);
					if (type === NodeType.ArrowFunctionExpression) path.setFlag(Flag.async, true);
					if (type === NodeType.MethodDefinition) path.setFlag(Flag.static, false);
					if (type === NodeType.ForOfStatement) path.setFlag(Flag.await, true);
				})
			).toBe("function*f(){}async()=>1;class A{m(){}}for await(a of b);");
		});

		it("should keep a function's kind as its own code reads it", () => {
			/**
			 * @param {string} source the source
			 * @param {number} flag `Flag.async` or `Flag.generator`
			 * @param {boolean} on whether to set it
			 * @param {import("../../../lib/javascript/syntax-parser").JavascriptSourceType=} sourceType what the source is read as
			 * @returns {string} the printed text
			 */
			const flagged = (source, flag, on, sourceType = "module") =>
				edited(
					source,
					[NodeType.FunctionDeclaration],
					(path) => path.setFlag(flag, on),
					sourceType
				);
			expect(() =>
				flagged("async function f(){await a}", Flag.async, false)
			).toThrow("its code holds await");
			expect(() =>
				flagged("async function f(){for await(a of b);}", Flag.async, false)
			).toThrow("its code holds await");
			expect(() =>
				flagged("function*f(){yield}", Flag.generator, false)
			).toThrow("its code holds yield");
			expect(() =>
				flagged("function f(){var await;(()=>await)}", Flag.async, true, "script")
			).toThrow("its code names something await");
			expect(
				flagged("async function f(){(async()=>await a)}", Flag.async, false)
			).toBe("function f(){async()=>await a}");
			expect(
				flagged("function f(){a.await;yield:;}", Flag.async, true, "script")
			).toBe("async function f(){a.await;yield:;}");
		});

		it.each([
			["no such flag", "a.b;", NodeType.MemberExpression, Flag.async, true, "a MemberExpression has no flag async"],
			["a private name computed", "class A{#a;m(){this.#a}}", NodeType.MemberExpression, Flag.computed, true, "a private name is never computed"],
			["a shorthand computed", "({a});", NodeType.Property, Flag.computed, true, "it is shorthand"],
			["a computed key that is no name", "a[1+1];", NodeType.MemberExpression, Flag.computed, false, "its BinaryExpression key is no name"],
			["optional outside a chain", "a.b;", NodeType.MemberExpression, Flag.optional, true, "no ChainExpression holds it"],
			["a method that is no function", "({a:1});", NodeType.Property, Flag.method, true, "its value is no plain function"],
			["shorthand of two names", "({a:b});", NodeType.Property, Flag.shorthand, true, "its key and value are not one name"],
			["delegating nothing", "function*f(){yield}", NodeType.YieldExpression, Flag.delegate, true, "it yields nothing"],
			["a unary operator after", "!a;", NodeType.UnaryExpression, Flag.prefix, false, "a unary operator is always a prefix"],
			["what follows from where it stands", "(()=>1);", NodeType.ArrowFunctionExpression, Flag.expression, false, "it follows from where the node stands"],
			["a generator arrow", "(()=>1);", NodeType.ArrowFunctionExpression, Flag.generator, true, "an arrow function is never a generator"],
			["an async getter", "({get a(){}});", NodeType.FunctionExpression, Flag.async, true, "a get is a plain function"],
			["a static constructor", "class A{constructor(){}}", NodeType.MethodDefinition, Flag.static, true, "a constructor is never static"],
			["await outside async", "function f(){for(a of b);}", NodeType.ForOfStatement, Flag.await, true, "no async function or module holds it"]
		])("should refuse %s", (_name, source, type, flag, on, message) => {
			expect(() =>
				edited(source, [type], (path) => path.setFlag(flag, on))
			).toThrow(message);
		});
	});

	describe("setText", () => {
		it("should set operators, kinds, a raw spelling and a phase", () => {
			expect(
				edited(
					'let a=1;if(a==2)b&&c;d+=1;!e;f++;g=0;({get h(){return 1}});class I{j(k){}}import * as l from "m";',
					Object.values(NodeType),
					(path) => {
						const type = path.type();
						if (type === NodeType.VariableDeclaration) path.setText(Part.kind, "const");
						if (type === NodeType.BinaryExpression) path.setText(Part.operator, "!==");
						if (type === NodeType.LogicalExpression) path.setText(Part.operator, "??");
						if (type === NodeType.AssignmentExpression && path.textOf(Part.operator) === "+=") path.setText(Part.operator, "**=");
						if (type === NodeType.UnaryExpression) path.setText(Part.operator, "typeof");
						if (type === NodeType.UpdateExpression) path.setText(Part.operator, "--");
						if (type === NodeType.Literal && path.value() === 0) path.setText(Part.raw, "0x10");
						if (type === NodeType.Property) path.setText(Part.kind, "init");
						if (type === NodeType.MethodDefinition) path.setText(Part.kind, "set");
						if (type === NodeType.ImportDeclaration) path.setText(Part.phase, "defer");
					}
				)
			).toBe('const a=1;if(a!==2)b??c;d**=1;typeof e;f--;g=16;({h:function(){return 1}});class I{set j(k){}}import defer*as l from"m";');
		});

		it("should leave an optional part out for an empty text", () => {
			expect(
				edited('import defer * as a from "b";', [NodeType.ImportDeclaration], (path) => {
					path.setText(Part.phase, "");
				})
			).toBe('import*as a from"b";');
		});

		it.each([
			["no such part", "a;", NodeType.Identifier, Part.operator, "+", "an Identifier has no part operator"],
			["what follows from other fields", '"use strict";', NodeType.ExpressionStatement, Part.directive, "x", "it follows from the node's other fields"],
			["a word that is no operator", "a+b;", NodeType.BinaryExpression, Part.operator, "&&", "it is no such operator"],
			["a pattern assigned otherwise than with =", "[a]=b;", NodeType.AssignmentExpression, Part.operator, "+=", "a pattern is only assigned with ="],
			["a kind no declaration has", "let a=1;", NodeType.VariableDeclaration, Part.kind, "val", "no declaration reads so here"],
			["const without values", "let a;", NodeType.VariableDeclaration, Part.kind, "const", "a const declaration gives each declarator a value"],
			["using with a pattern", "function f(){let [a]=b;}", NodeType.VariableDeclaration, Part.kind, "using", /using declaration binds names only|no declaration reads/],
			["a getter with parameters", "({a(b){}});", NodeType.Property, Part.kind, "get", "a getter is a plain function of no parameters"],
			["a setter without one", "class A{a(){}}", NodeType.MethodDefinition, Part.kind, "set", "a setter is a plain function of one parameter"],
			["a property kind", "({a:1});", NodeType.Property, Part.kind, "method", "a property is init, get or set"],
			["a method's kind on a shorthand", "({a(){}});", NodeType.Property, Part.kind, "get", "it is a method or shorthand"],
			["a constructor named otherwise", "class A{a(){}}", NodeType.MethodDefinition, Part.kind, "constructor", "a constructor is a plain method named constructor"],
			["a method kind", "class A{a(){}}", NodeType.MethodDefinition, Part.kind, "init", "a method is method, get, set or constructor"],
			["a phase", 'import a from "b";', NodeType.ImportDeclaration, Part.phase, "now", "a phase is defer or source"],
			["a deferred default", 'import a from "b";', NodeType.ImportDeclaration, Part.phase, "defer", "a deferred import imports a namespace alone"],
			["a source namespace", 'import * as a from "b";', NodeType.ImportDeclaration, Part.phase, "source", "a source import imports a default alone"],
			["a raw spelling of no literal", "1;", NodeType.Literal, Part.raw, "a", '"a" is no literal']
		])("should refuse %s", (_name, source, type, part, text, message) => {
			expect(() =>
				edited(source, [type], (path) => path.setText(part, text), source.startsWith('"use') ? "script" : "module")
			).toThrow(message);
		});

		it("should refuse text that is no string", () => {
			expect(() =>
				edited("a+b;", [NodeType.BinaryExpression], (path) =>
					path.setText(Part.operator, /** @type {EXPECTED_ANY} */ (1))
				)
			).toThrow("a operator is text");
		});

		it("should make a constructor of a method named so", () => {
			expect(
				edited("class A{constructor(){}}", [NodeType.MethodDefinition], (path) => {
					path.setText(Part.kind, "method");
					path.setText(Part.kind, "constructor");
				})
			).toBe("class A{constructor(){}}");
		});
	});
});
