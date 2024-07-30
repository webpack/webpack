const js = require("@eslint/js");
const prettier = require("eslint-plugin-prettier");
const n = require("eslint-plugin-n");
const jest = require("eslint-plugin-jest");
const jsdoc = require("eslint-plugin-jsdoc");
const prettierConfig = require("eslint-config-prettier");
const globals = require("globals");

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

			// Ignore some examples files
			"examples/**/*.js",
			"examples/**/*.mjs",
			"!examples/*/webpack.config.js"
		]
	},
	js.configs.recommended,
	n.configs["flat/recommended"],
	{
		...jsdocConfig,
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
	prettierConfig,
	{
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
		plugins: {
			prettier
		},
		rules: {
			"prettier/prettier": "error",
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
				{ caughtErrors: "none", args: "none", ignoreRestSiblings: true }
			],
			"no-inner-declarations": "error",
			"no-loop-func": "off",
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
			"n/no-missing-require": ["error", { allowModules: ["webpack"] }],
			"n/no-unsupported-features/node-builtins": [
				"error",
				{
					ignores: ["zlib.createBrotliCompress", "zlib.createBrotliDecompress"]
				}
			],
			"n/exports-style": "error",
			// Disallow @ts-ignore directive. Use @ts-expect-error instead
			"no-warning-comments": [
				"error",
				{ terms: ["@ts-ignore"], location: "start" }
			]
		},
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
			"n/exports-style": "off"
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
			"object-shorthand": "off"
		}
	},
	{
		files: ["examples/**/*.js"],
		rules: {
			"n/no-missing-require": "off"
		}
	},
	{
		files: ["lib/util/semver.js"],
		rules: {
			"n/exports-style": "off"
		}
	}
];
