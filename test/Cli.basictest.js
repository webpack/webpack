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

	test(
		"reset array",
		{
			"stats-warnings-filter-reset": true,
			"stats-warnings-filter": "path",
			"module-rules-reset": true,
			"module-rules-test": ["/\\.css$/", "/\\.js$/"],
			"module-rules-use": ["css-loader", "babel-loader"]
		},
		{
			stats: { warningsFilter: [/a/, /b/] },
			module: {
				rules: [
					{
						test: /\.js$/,
						use: "typescript-loader"
					}
				]
			}
		},
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
			  "stats": Object {
			    "warningsFilter": Array [
			      "path",
			    ],
			  },
			}
		`)
	);

	test(
		"numbers",
		{
			"watch-options-aggregate-timeout": 100,
			"watch-options-poll": "100",
			"output-chunk-load-timeout": "20000"
		},
		{},
		e =>
			e.toMatchInlineSnapshot(`
			Object {
			  "output": Object {
			    "chunkLoadTimeout": 20000,
			  },
			  "watchOptions": Object {
			    "aggregateTimeout": 100,
			    "poll": 100,
			  },
			}
		`)
	);

	test(
		"booleans and enums",
		{
			"optimization-used-exports": true,
			"output-compare-before-emit": false,
			"output-iife": "true",
			"output-library-name": ["hello", "world"],
			"output-library-umd-named-define": "false",
			"stats-logging": "verbose",
			amd: "false"
		},
		{},
		e =>
			e.toMatchInlineSnapshot(`
			Object {
			  "amd": false,
			  "optimization": Object {
			    "usedExports": true,
			  },
			  "output": Object {
			    "compareBeforeEmit": false,
			    "iife": true,
			    "library": Object {
			      "name": Array [
			        "hello",
			        "world",
			      ],
			      "umdNamedDefine": false,
			    },
			  },
			  "stats": Object {
			    "logging": "verbose",
			  },
			}
		`)
	);

	test(
		"errors",
		{
			"output-library-name": "non-object",
			"resolve-loader-unsafe-cache": [true, false],
			"output-chunk-load-timeout": "20000x",
			"cache-type": "filsystem",
			"entry-reset": false,
			"module-unknown-context-reg-exp": "ab?c*",
			"module-wrapped-context-reg-exp": 123,
			"my-argument": true
		},
		{
			output: {
				library: "hello"
			}
		},
		e =>
			e.toMatchInlineSnapshot(`
			Array [
			  Object {
			    "argument": "output-library-name",
			    "index": undefined,
			    "path": "output",
			    "type": "unexpected-non-object-in-path",
			    "value": "non-object",
			  },
			  Object {
			    "argument": "resolve-loader-unsafe-cache",
			    "index": 0,
			    "path": "resolveLoader.unsafeCache",
			    "type": "multiple-values-unexpected",
			    "value": true,
			  },
			  Object {
			    "argument": "resolve-loader-unsafe-cache",
			    "index": 1,
			    "path": "resolveLoader.unsafeCache",
			    "type": "multiple-values-unexpected",
			    "value": false,
			  },
			  Object {
			    "argument": "output-chunk-load-timeout",
			    "expected": "number",
			    "index": undefined,
			    "path": "output.chunkLoadTimeout",
			    "type": "invalid-value",
			    "value": "20000x",
			  },
			  Object {
			    "argument": "cache-type",
			    "expected": "memory",
			    "index": undefined,
			    "path": "cache.type",
			    "type": "invalid-value",
			    "value": "filsystem",
			  },
			  Object {
			    "argument": "cache-type",
			    "expected": "filesystem",
			    "index": undefined,
			    "path": "cache.type",
			    "type": "invalid-value",
			    "value": "filsystem",
			  },
			  Object {
			    "argument": "entry-reset",
			    "expected": "true (will reset the previous value to an empty array)",
			    "index": undefined,
			    "path": "entry",
			    "type": "invalid-value",
			    "value": false,
			  },
			  Object {
			    "argument": "module-unknown-context-reg-exp",
			    "expected": "regular expression (example: /ab?c*/)",
			    "index": undefined,
			    "path": "module.unknownContextRegExp",
			    "type": "invalid-value",
			    "value": "ab?c*",
			  },
			  Object {
			    "argument": "module-unknown-context-reg-exp",
			    "expected": "true | false",
			    "index": undefined,
			    "path": "module.unknownContextRegExp",
			    "type": "invalid-value",
			    "value": "ab?c*",
			  },
			  Object {
			    "argument": "module-wrapped-context-reg-exp",
			    "expected": "regular expression (example: /ab?c*/)",
			    "index": undefined,
			    "path": "module.wrappedContextRegExp",
			    "type": "invalid-value",
			    "value": 123,
			  },
			  Object {
			    "argument": "my-argument",
			    "path": "",
			    "type": "unknown-argument",
			  },
			]
		`)
	);
});
