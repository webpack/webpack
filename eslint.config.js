const js = require("@eslint/js");
const prettier = require("eslint-plugin-prettier");
const n = require("eslint-plugin-n");
const jest = require("eslint-plugin-jest");
const jsdoc = require("eslint-plugin-jsdoc");
const prettierConfig = require("eslint-config-prettier");
const globals = require("globals");
const stylistic = require("@stylistic/eslint-plugin");
const unicorn = require("eslint-plugin-unicorn");

const nodeConfig = n.configs["flat/recommended"];
const jsdocConfig = jsdoc.configs["flat/recommended-typescript-flavor-error"];

module.exports = [
	{
		ignores: [
			// Ignore some test files
			"test/**/*.*",
			"!test/*.js",
			"!test/**/webpack.config.js",
			"!test/**/test.config.js",
			"!test/**/test.filter.js",
			"test/cases/parsing/es2022/test.filter.js",
			"!test/**/errors.js",
			"!test/**/warnings.js",
			"!test/**/deprecations.js",
			"!test/**/infrastructure-log.js",
			"!test/helpers/*.*",

			// Ignore some folders
			"benchmark",
			"coverage",

			// Ignore generated files
			"*.check.js",

			// Ignore not supported files
			"*.d.ts",

			// Ignore precompiled schemas
			"schemas/**/*.check.js",

			// Auto generation
			"lib/util/semver.js",

			// Ignore some examples files
			"examples/**/*.js",
			"examples/**/*.mjs",
			"!examples/*/webpack.config.js"
		]
	},
	{
		...js.configs.recommended,
		languageOptions: {
			ecmaVersion: 2018,
			globals: {
				...globals.node,
				...globals.es2018,
				WebAssembly: true
			}
		},
		linterOptions: {
			reportUnusedDisableDirectives: true
		},
		rules: {
			...js.configs.recommended.rules,
			"no-template-curly-in-string": "error",
			"no-caller": "error",
			"no-control-regex": "off",
			yoda: "error",
			eqeqeq: "error",
			"eol-last": "error",
			"no-extra-bind": "warn",
			"no-process-exit": "warn",
			"no-use-before-define": "off",
			"no-unused-vars": [
				"error",
				{
					vars: "all",
					varsIgnorePattern: "^_",
					args: "none",
					argsIgnorePattern: "^_",
					caughtErrors: "all",
					caughtErrorsIgnorePattern: "^_",
					ignoreRestSiblings: true
				}
			],
			"no-inner-declarations": "error",
			"prefer-const": [
				"error",
				{
					destructuring: "all",
					ignoreReadBeforeAssign: true
				}
			],
			"object-shorthand": "error",
			"no-else-return": "error",
			"no-lonely-if": "error",
			"no-undef-init": "error",
			// Disallow @ts-ignore directive. Use @ts-expect-error instead
			"no-warning-comments": [
				"error",
				{ terms: ["@ts-ignore"], location: "start" }
			],
			"no-constructor-return": "error",
			"symbol-description": "error",
			"array-callback-return": [
				"error",
				{
					allowImplicit: true
				}
			],
			"no-promise-executor-return": "error",
			"no-undef": "error",
			"guard-for-in": "error",
			"no-constant-condition": "error",
			camelcase: [
				"error",
				{
					allow: [
						"__webpack_require__",
						"__webpack_public_path__",
						"__webpack_base_uri__",
						"__webpack_modules__",
						"__webpack_chunk_load__",
						"__non_webpack_require__",
						"__webpack_nonce__",
						"__webpack_hash__",
						"__webpack_chunkname__",
						"__webpack_get_script_filename__",
						"__webpack_runtime_id__",
						"__system_context__",
						"__webpack_share_scopes__",
						"__webpack_init_sharing__",
						"__webpack_require_module__",
						"_stream_duplex",
						"_stream_passthrough",
						"_stream_readable",
						"_stream_transform",
						"_stream_writable",
						"string_decoder"
					]
				}
			],
			"prefer-exponentiation-operator": "error",
			"no-useless-return": "error",
			"no-return-assign": "error",
			"default-case-last": "error",
			"default-param-last": "error",
			"dot-notation": "error",
			"grouped-accessor-pairs": "error",
			"id-match": [
				"error",
				"^[$a-zA-Z_][$a-zA-Z0-9_]*$",
				{
					properties: true
				}
			],
			"no-extra-label": "error",
			"no-label-var": "error",
			"no-lone-blocks": "error",
			"no-multi-str": "error",
			"no-new-func": "error",
			"no-unneeded-ternary": ["error", { defaultAssignment: false }],
			"no-useless-call": "error",
			"no-useless-concat": "error",
			"prefer-object-spread": "error",
			"prefer-regex-literals": "error",
			"prefer-rest-params": "error",
			"no-var": "error",
			"one-var": ["error", "never"],
			"prefer-template": "error",
			"no-implicit-coercion": [
				"error",
				{
					boolean: true,
					number: true,
					string: true
				}
			],
			"arrow-body-style": ["error", "as-needed"],
			"new-cap": [
				"error",
				{
					newIsCapExceptions: [],
					capIsNewExceptions: ["A", "F", "D", "MODULES_GROUPERS"]
				}
			],
			"func-style": [
				"error",
				"declaration",
				{
					allowArrowFunctions: true
				}
			],
			"no-loop-func": "error",
			"no-unreachable-loop": "error",
			"no-unmodified-loop-condition": "error",
			"prefer-spread": "error",
			"no-sequences": "error",
			// TODO Enable
			"id-length": "off",
			"prefer-destructuring": "off"
		}
	},
	{
		plugins: {
			unicorn
		},
		rules: {
			"unicorn/catch-error-name": [
				"error",
				{ name: "err", ignore: [/(^_|[0-9]+$)/i] }
			],
			"unicorn/prefer-includes": "error",
			"unicorn/no-zero-fractions": "error",
			"unicorn/prefer-string-starts-ends-with": "error",
			"unicorn/prefer-default-parameters": "error",
			"unicorn/prefer-negative-index": "error",
			"unicorn/prefer-ternary": ["error", "only-single-line"],
			"unicorn/prefer-array-find": "error",
			"unicorn/no-lonely-if": "error",
			"unicorn/no-hex-escape": "error",
			"unicorn/escape-case": "error",
			"unicorn/no-array-for-each": "error",
			"unicorn/prefer-number-properties": "error",
			"unicorn/prefer-native-coercion-functions": "error",
			// TODO Enable
			"unicorn/prefer-spread": "off"
		}
	},
	{
		plugins: {
			"@stylistic": stylistic
		},
		rules: {
			"@stylistic/lines-between-class-members": "error",
			"@stylistic/quotes": [
				"error",
				"double",
				{ avoidEscape: true, allowTemplateLiterals: false }
			],
			"@stylistic/spaced-comment": [
				"error",
				"always",
				{
					line: {
						markers: ["=", "!"], // Space here to support sprockets directives
						exceptions: ["-", "+"]
					},
					block: {
						markers: ["=", "!"], // Space here to support sprockets directives
						exceptions: ["-", "+"],
						balanced: true
					}
				}
			]
		}
	},
	{
		...nodeConfig,
		rules: {
			...nodeConfig.rules,
			"n/no-missing-require": ["error", { allowModules: ["webpack"] }],
			"n/no-unsupported-features/node-builtins": [
				"error",
				{
					ignores: ["zlib.createBrotliCompress", "zlib.createBrotliDecompress"]
				}
			],
			"n/exports-style": "error"
		}
	},
	{
		...jsdocConfig,
		settings: {
			jsdoc: {
				mode: "typescript",
				// supported tags https://github.com/microsoft/TypeScript-wiki/blob/master/JSDoc-support-in-JavaScript.md
				tagNamePreference: {
					...["implements", "const", "memberof", "yields"].reduce(
						(acc, tag) => {
							acc[tag] = {
								message: `@${tag} currently not supported in TypeScript`
							};
							return acc;
						},
						{}
					),
					extends: "extends",
					return: "returns",
					constructor: "constructor",
					prop: "property",
					arg: "param",
					augments: "extends",
					description: false,
					desc: false,
					inheritdoc: false,
					class: "constructor"
				},
				overrideReplacesDocs: false
			}
		},
		rules: {
			...jsdocConfig.rules,
			// Override recommended
			// TODO remove me after switch to typescript strict mode
			"jsdoc/require-jsdoc": "off",
			// Doesn't support function overloading/tuples/`readonly`/module keyword/etc
			// Also `typescript` reports this itself
			"jsdoc/valid-types": "off",
			// A lot of false positive with loops/`switch`/`if`/etc
			"jsdoc/require-returns-check": "off",
			// TODO fix and enable in future
			"jsdoc/require-property-description": "off",

			// More rules
			"jsdoc/check-indentation": "error",
			"jsdoc/no-bad-blocks": "error",
			"jsdoc/require-hyphen-before-param-description": ["error", "never"],
			"jsdoc/require-template": "error",
			"jsdoc/no-blank-block-descriptions": "error",
			"jsdoc/no-blank-blocks": "error",
			"jsdoc/require-asterisk-prefix": "error"
		}
	},
	{
		files: ["bin/**/*.js"],
		// Allow to use `dynamic` import
		languageOptions: {
			ecmaVersion: 2020
		},
		rules: {
			"n/no-unsupported-features/es-syntax": [
				"error",
				{
					ignores: ["hashbang", "dynamic-import"]
				}
			]
		}
	},
	{
		files: ["lib/**/*.runtime.js", "hot/*.js"],
		languageOptions: {
			ecmaVersion: 5,
			globals: {
				...globals.browser,
				...globals.es5
			}
		},
		rules: {
			"prefer-const": "off",
			"object-shorthand": "off",
			"no-undef-init": "off",
			"no-var": "off",
			"n/exports-style": "off",
			"prefer-template": "off",
			"no-implicit-coercion": "off",
			"func-style": "off",
			"unicorn/prefer-includes": "off",
			"unicorn/no-useless-undefined": "off",
			"unicorn/no-array-for-each": "off"
		}
	},
	{
		files: ["tooling/**/*.js"],
		languageOptions: {
			ecmaVersion: 2020,
			globals: {
				...globals.es2020
			}
		}
	},
	{
		...jest.configs["flat/recommended"],
		files: ["test/**/*.js"],
		languageOptions: {
			ecmaVersion: 2020,
			globals: {
				...globals.jest,
				nsObj: false
			}
		},
		rules: {
			...jest.configs["flat/recommended"].rules,
			"jest/no-standalone-expect": "off",
			"jest/valid-title": [
				"error",
				{
					ignoreTypeOfDescribeName: true,
					ignoreTypeOfTestName: true
				}
			],
			"jest/no-done-callback": "off",
			"jest/expect-expect": "off",
			"jest/no-conditional-expect": "off",
			"n/no-unsupported-features/node-builtins": [
				"error",
				{
					allowExperimental: true
				}
			],
			"object-shorthand": "off",
			camelcase: "off",
			"no-var": "off"
		}
	},
	{
		files: [
			"test/configCases/{dll-plugin-entry,dll-plugin-side-effects,dll-plugin}/**/webpack.config.js"
		],
		rules: {
			"n/no-missing-require": "off"
		}
	},
	{
		files: ["examples/**/*.js"],
		rules: {
			"n/no-missing-require": "off"
		}
	},
	{
		...prettierConfig,
		plugins: {
			...prettierConfig.plugins,
			prettier
		},
		rules: {
			...prettierConfig.rules,
			"prettier/prettier": "error"
		}
	}
];
