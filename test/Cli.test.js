const { getArguments, processArguments } = require("../").cli;

describe("Cli", () => {
	it("should generate the correct cli flags", () => {
		expect(getArguments()).toMatchSnapshot();
	});

	const test = (name, values, config, fn) => {
		it(`should correctly process arguments for ${name}`, () => {
			const args = getArguments();
			const problems = processArguments(args, config, values);
			fn(expect(problems || config));
		});
	};

	test("none", {}, {}, e => e.toMatchInlineSnapshot(`Object {}`));

	test("root boolean", { bail: true }, {}, e =>
		e.toMatchInlineSnapshot(`
		Object {
		  "bail": true,
		}
	`)
	);

	test("root single item of multiple", { entry: "./a.js" }, {}, e =>
		e.toMatchInlineSnapshot(`
		Object {
		  "entry": Array [
		    "./a.js",
		  ],
		}
	`)
	);

	test(
		"root single item of multiple with existing item",
		{ entry: "./a.js" },
		{ entry: "./old.js" },
		e =>
			e.toMatchInlineSnapshot(`
			Object {
			  "entry": Array [
			    "./old.js",
			    "./a.js",
			  ],
			}
		`)
	);

	test(
		"root single item of multiple with existing items",
		{ entry: "./a.js" },
		{ entry: ["./old1.js", "./old2.js"] },
		e =>
			e.toMatchInlineSnapshot(`
			Object {
			  "entry": Array [
			    "./old1.js",
			    "./old2.js",
			    "./a.js",
			  ],
			}
		`)
	);

	test("root multiple items", { entry: ["./a.js", "./b.js"] }, {}, e =>
		e.toMatchInlineSnapshot(`
		Object {
		  "entry": Array [
		    "./a.js",
		    "./b.js",
		  ],
		}
	`)
	);

	test(
		"root multiple items with existing item",
		{ entry: ["./a.js", "./b.js"] },
		{ entry: "./old.js" },
		e =>
			e.toMatchInlineSnapshot(`
			Object {
			  "entry": Array [
			    "./old.js",
			    "./a.js",
			    "./b.js",
			  ],
			}
		`)
	);

	test(
		"root multiple items with existing items",
		{ entry: ["./a.js", "./b.js"] },
		{ entry: ["./old1.js", "./old2.js"] },
		e =>
			e.toMatchInlineSnapshot(`
			Object {
			  "entry": Array [
			    "./old1.js",
			    "./old2.js",
			    "./a.js",
			    "./b.js",
			  ],
			}
		`)
	);

	test("nested boolean", { "experiments-top-level-await": true }, {}, e =>
		e.toMatchInlineSnapshot(`
		Object {
		  "experiments": Object {
		    "topLevelAwait": true,
		  },
		}
	`)
	);

	test(
		"nested regexp",
		{ "stats-warnings-filter": ["/module/", "path"] },
		{},
		e =>
			e.toMatchInlineSnapshot(`
			Object {
			  "stats": Object {
			    "warningsFilter": Array [
			      /module/,
			      "path",
			    ],
			  },
			}
		`)
	);

	// TODO fix this test case
	test(
		"nested multiple",
		{
			"module-rules-test": ["/\\.css$/", "/\\.js$/"],
			"module-rules-use": ["css-loader", "babel-loader"]
		},
		{},
		e =>
			e.toMatchInlineSnapshot(`
Object {
  "module": Object {
    "rules": Array [
      Object {
        "test": /\\\\\\.css\\$/,
        "use": "css-loader",
      },
      Object {
        "test": /\\\\\\.js\\$/,
        "use": "babel-loader",
      },
    ],
  },
}
`)
	);
});
