"use strict";

const { createColors, getArguments, isColorSupported, processArguments } =
	require("../").cli;

describe("Cli", () => {
	describe("getArguments", () => {
		it("should generate the correct cli flags", () => {
			expect(getArguments()).toMatchSnapshot();
		});

		it("should generate the correct cli flags with custom schema", () => {
			const schema = {
				title: "custom CLI options",
				type: "object",
				additionalProperties: false,
				properties: {
					"with-reset-description": {
						type: "array",
						items: {
							type: "string"
						},
						description: "original description",
						cli: {
							resetDescription: "custom reset"
						}
					},
					"with-cli-description": {
						type: "string",
						description: "original description",
						cli: {
							description: "description for CLI option"
						}
					},
					"with-negative-description": {
						type: "boolean",
						description: "original description",
						cli: {
							negatedDescription: "custom negative description"
						}
					},
					"with-both-cli-and-negative-description": {
						type: "boolean",
						description: "original description",
						cli: {
							description: "description for CLI option",
							negatedDescription: "custom negative description"
						}
					}
				}
			};

			expect(getArguments(schema)).toMatchSnapshot();
		});
	});

	describe("processArguments", () => {
		const test = (name, values, config, fn) => {
			it(`should correctly process arguments for ${name}`, () => {
				const args = getArguments();
				const problems = processArguments(args, config, values);
				fn(expect(problems || config));
			});
		};

		test("none", {}, {}, (e) => e.toMatchInlineSnapshot("Object {}"));

		test("root boolean", { bail: true }, {}, (e) =>
			e.toMatchInlineSnapshot(`
		Object {
		  "bail": true,
		}
	`)
		);

		test("root single item of multiple", { entry: "./a.js" }, {}, (e) =>
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
			(e) =>
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
			(e) =>
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

		test("root multiple items", { entry: ["./a.js", "./b.js"] }, {}, (e) =>
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
			(e) =>
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
			(e) =>
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

		test("nested boolean", { "experiments-top-level-await": true }, {}, (e) =>
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
			(e) =>
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
			(e) =>
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
			(e) =>
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
			(e) =>
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
			(e) =>
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

		// cspell:ignore filsystem
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
			(e) =>
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

	describe("isColorSupported", () => {
		const OLD_ENV = process.env;

		beforeEach(() => {
			// Most important - it clears the cache
			jest.resetModules();
			process.env = { ...OLD_ENV };
			// Prevent `process.env.FORCE_COLOR` from being auto set by `jest-worker`
			if (OLD_ENV.FORCE_COLOR) {
				delete process.env.FORCE_COLOR;
			}
			// Prevent `process.env.TERM` default value
			if (OLD_ENV.TERM) {
				delete process.env.TERM;
			}
		});

		afterAll(() => {
			process.env = OLD_ENV;
		});

		it("env NO_COLOR", () => {
			process.env.NO_COLOR = "1";

			expect(isColorSupported()).toBe(false);
		});

		it("env FORCE_COLOR", () => {
			process.env.FORCE_COLOR = "1";

			expect(isColorSupported()).toBe(true);
		});

		it("env TERM", () => {
			const isCI =
				"CI" in process.env &&
				("GITHUB_ACTIONS" in process.env ||
					"GITLAB_CI" in process.env ||
					"CIRCLECI" in process.env);

			process.env.TERM = "dumb";

			expect(isColorSupported()).toBe(isCI);
		});

		it("env GITHUB_ACTIONS", () => {
			process.env.CI = "1";
			process.env.GITHUB_ACTIONS = "1";

			expect(isColorSupported()).toBe(true);
		});

		it("env GITLAB_CI", () => {
			process.env.CI = "1";
			process.env.GITLAB_CI = "1";

			expect(isColorSupported()).toBe(true);
		});

		it("env CIRCLECI", () => {
			process.env.CI = "1";
			process.env.CIRCLECI = "1";

			expect(isColorSupported()).toBe(true);
		});
	});

	describe("createColors", () => {
		const colorsMap = [
			["reset", "\u001B[0m", "\u001B[0m"],
			["bold", "\u001B[1m", "\u001B[22m"],
			["dim", "\u001B[2m", "\u001B[22m"],
			["italic", "\u001B[3m", "\u001B[23m"],
			["underline", "\u001B[4m", "\u001B[24m"],
			["inverse", "\u001B[7m", "\u001B[27m"],
			["hidden", "\u001B[8m", "\u001B[28m"],
			["strikethrough", "\u001B[9m", "\u001B[29m"],
			["black", "\u001B[30m", "\u001B[39m"],
			["red", "\u001B[31m", "\u001B[39m"],
			["green", "\u001B[32m", "\u001B[39m"],
			["yellow", "\u001B[33m", "\u001B[39m"],
			["blue", "\u001B[34m", "\u001B[39m"],
			["magenta", "\u001B[35m", "\u001B[39m"],
			["cyan", "\u001B[36m", "\u001B[39m"],
			["white", "\u001B[37m", "\u001B[39m"],
			["gray", "\u001B[90m", "\u001B[39m"],
			["bgBlack", "\u001B[40m", "\u001B[49m"],
			["bgRed", "\u001B[41m", "\u001B[49m"],
			["bgGreen", "\u001B[42m", "\u001B[49m"],
			["bgYellow", "\u001B[43m", "\u001B[49m"],
			["bgBlue", "\u001B[44m", "\u001B[49m"],
			["bgMagenta", "\u001B[45m", "\u001B[49m"],
			["bgCyan", "\u001B[46m", "\u001B[49m"],
			["bgWhite", "\u001B[47m", "\u001B[49m"],
			["blackBright", "\u001B[90m", "\u001B[39m"],
			["redBright", "\u001B[91m", "\u001B[39m"],
			["greenBright", "\u001B[92m", "\u001B[39m"],
			["yellowBright", "\u001B[93m", "\u001B[39m"],
			["blueBright", "\u001B[94m", "\u001B[39m"],
			["magentaBright", "\u001B[95m", "\u001B[39m"],
			["cyanBright", "\u001B[96m", "\u001B[39m"],
			["whiteBright", "\u001B[97m", "\u001B[39m"],
			["bgBlackBright", "\u001B[100m", "\u001B[49m"],
			["bgRedBright", "\u001B[101m", "\u001B[49m"],
			["bgGreenBright", "\u001B[102m", "\u001B[49m"],
			["bgYellowBright", "\u001B[103m", "\u001B[49m"],
			["bgBlueBright", "\u001B[104m", "\u001B[49m"],
			["bgMagentaBright", "\u001B[105m", "\u001B[49m"],
			["bgCyanBright", "\u001B[106m", "\u001B[49m"],
			["bgWhiteBright", "\u001B[107m", "\u001B[49m"]
		];

		const colors = createColors({ useColor: true });

		it("simple", () => {
			for (const [name, open, close] of colorsMap) {
				expect(colors[name](name)).toBe(open + name + close);
			}
		});

		it("nesting", () => {
			expect(
				colors.bold(`bold ${colors.red(`red ${colors.dim("dim")} red`)} bold`)
			).toBe(
				/* cspell:disable-next-line */
				"\u001B[1mbold \u001B[31mred \u001B[2mdim\u001B[22m\u001B[1m red\u001B[39m bold\u001B[22m"
			);
			expect(
				colors.magenta(
					`magenta ${colors.yellow(
						`yellow ${colors.cyan("cyan")} ${colors.red("red")} ${colors.green(
							"green"
						)} yellow`
					)} magenta`
				)
			).toBe(
				/* cspell:disable-next-line */
				"\u001B[35mmagenta \u001B[33myellow \u001B[36mcyan\u001B[33m \u001B[31mred\u001B[33m \u001B[32mgreen\u001B[33m yellow\u001B[35m magenta\u001B[39m"
			);
		});

		it("numbers & others", () => {
			for (const n of [new Date(), -1e10, -1, -0.1, 0, 0.1, 1, 1e10]) {
				expect(colors.red(n)).toBe(`\u001B[31m${n}\u001B[39m`);
			}
		});

		it("empty & falsy values", () => {
			expect(colors.blue()).toBe("");
			expect(colors.blue("")).toBe("");
			expect(colors.blue(undefined)).toBe("");
			expect(colors.blue(0)).toBe("\u001B[34m0\u001B[39m");
			// eslint-disable-next-line unicorn/prefer-number-properties
			expect(colors.blue(NaN)).toBe("\u001B[34mNaN\u001B[39m");
			expect(colors.blue(Number.NaN)).toBe("\u001B[34mNaN\u001B[39m");
			/* cspell:disable-next-line */
			expect(colors.blue(null)).toBe("\u001B[34mnull\u001B[39m");
			/* cspell:disable-next-line */
			expect(colors.blue(true)).toBe("\u001B[34mtrue\u001B[39m");
			/* cspell:disable-next-line */
			expect(colors.blue(false)).toBe("\u001B[34mfalse\u001B[39m");
			expect(colors.blue(Infinity)).toBe("\u001B[34mInfinity\u001B[39m");
		});

		const noColors = createColors({ useColor: false });

		it("simple (no colors)", () => {
			for (const [name] of colorsMap) {
				expect(noColors[name](name)).toBe(name);
			}
		});

		const defaultColors = createColors();

		it("simple (colors by default)", () => {
			for (const [name, open, close] of colorsMap) {
				expect(defaultColors[name](name)).toBe(open + name + close);
			}
		});
	});
});
