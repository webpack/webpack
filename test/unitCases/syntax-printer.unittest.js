"use strict";

// cspell:ignore fnames

const { load } = require("../../lib/javascript/syntax").printer;

/**
 * Sources chosen for the decisions the mangler makes: which scope hands out a
 * name, and which names it may not hand out.
 * @type {[string, string, EXPECTED_OBJECT?][]}
 */
const CASES = [
	[
		"nested scopes",
		`function outer(first, second) {
			function inner(third) { return first + second + third; }
			return inner(1) + first;
		}
		sink(outer(1, 2));`
	],
	[
		"a name referenced from an inner scope",
		`const shared = 1;
		function reader() { const own = 2; return shared + own; }
		sink(reader());`
	],
	[
		"labels, which are numbered on their own",
		`outer: for (let i = 0; i < 10; i++) {
			inner: for (let j = 0; j < 10; j++) {
				if (j > i) continue outer;
				if (j === 3) break inner;
				sink(i, j);
			}
		}`
	],
	[
		"a catch parameter redefining a function-scoped name",
		`function run(error) {
			try { sink(error); } catch (error) { sink(error); }
			return error;
		}
		sink(run(1));`
	],
	[
		"a function expression whose argument could shadow its name",
		"sink(function named(argument) { return named && argument; });"
	],
	[
		"a function declared inside a block",
		`function host() {
			{ function blockScoped() { return 1; } sink(blockScoped()); }
			return typeof blockScoped;
		}
		sink(host());`
	],
	[
		"reserved names, which stay as written",
		"function keep(reservedName, other) { return reservedName + other; } sink(keep(1, 2));",
		{ mangle: { reserved: ["reservedName"] } }
	],
	[
		"exported names, which a module may not rename",
		"export const exported = 1; export function run(inner) { return inner + exported; }",
		{ module: true }
	],
	[
		"many names in one scope, where one-character names run out",
		`function crowded(input) {
			${Array.from({ length: 80 }, (_, i) => `let variable${i} = input + ${i};`).join("\n")}
			return ${Array.from({ length: 80 }, (_, i) => `variable${i}`).join("+")};
		}
		sink(crowded(1));`,
		// Compress folds the whole body away, and the names are the subject here.
		{ compress: false }
	],
	[
		"options this phase declines, which terser mangles itself",
		"function kept(argument) { return argument; } sink(kept(1));",
		{ mangle: { keep_fnames: true } }
	],
	[
		"class and method names beside mangled locals",
		`class Thing { constructor(value) { this.value = value; } read(offset) { return this.value + offset; } }
		sink(new Thing(1).read(2));`
	]
];

describe("syntax-printer", () => {
	it("should install onto terser", async () => {
		const terser = await load();
		expect(terser.phases).toContain("mangle");
		expect(typeof terser.minify).toBe("function");
	});

	for (const [name, source, options] of CASES) {
		it(`should mangle exactly as terser does: ${name}`, async () => {
			const { minify } = await load();
			const reference = require("terser");
			const settings = {
				compress: { passes: 2 },
				mangle: true,
				...options
			};
			const ours = await minify(source, JSON.parse(JSON.stringify(settings)));
			const theirs = await reference.minify(
				source,
				JSON.parse(JSON.stringify(settings))
			);
			expect(ours.code).toBe(theirs.code);
			expect(ours.code).toMatchSnapshot();
		});
	}

	it("should leave a name terser cannot mangle alone", async () => {
		const { minify } = await load();
		const result = await minify("function top(argument) { return argument; }", {
			compress: false,
			mangle: true
		});

		expect(result.code).toBe("function top(n){return n}");
	});

	it("should mangle a toplevel name when asked to", async () => {
		const { minify } = await load();
		const result = await minify(
			"function top(argument) { return argument; } top(1);",
			{ compress: false, mangle: { toplevel: true } }
		);

		expect(result.code).toBe("function n(n){return n}n(1);");
	});
});
