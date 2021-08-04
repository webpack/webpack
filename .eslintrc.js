module.exports = {
	root: true,
	plugins: ["prettier", "node", "jest", "jsdoc"],
	extends: [
		"eslint:recommended",
		"plugin:node/recommended",
		"plugin:prettier/recommended"
	],
	env: {
		node: true,
		es6: true
	},
	parserOptions: {
		ecmaVersion: 2018
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
		"no-unused-vars": ["error", { args: "none", ignoreRestSiblings: true }],
		"no-loop-func": "off",
		"node/no-missing-require": ["error", { allowModules: ["webpack"] }],
		"jsdoc/check-indentation": "error",
		"jsdoc/check-param-names": "error",
		"jsdoc/check-property-names": "error",
		"jsdoc/check-tag-names": "error",
		"jsdoc/require-hyphen-before-param-description": ["error", "never"],
		"jsdoc/require-param-description": "error",
		"jsdoc/require-param-name": "error",
		"jsdoc/require-param-type": "error",
		"jsdoc/require-param": "error",
		"jsdoc/require-property": "error",
		"jsdoc/require-property-name": "error",
		"jsdoc/require-property-type": "error",
		"jsdoc/require-returns-description": "error",
		"jsdoc/require-returns-type": "error",
		"jsdoc/require-returns": "error",
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
				...["implements", "const", "memberof", "readonly", "yields"].reduce(
					(acc, tag) => {
						acc[tag] = {
							message: `@${tag} currently not supported in Typescript`
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
	overrides: [
		{
			files: ["lib/**/*.runtime.js", "hot/*.js"],
			env: {
				es6: false,
				browser: true
			},
			globals: {
				Promise: false
			},
			parserOptions: {
				ecmaVersion: 5
			}
		},
		{
			files: ["test/**/*.js"],
			env: {
				"jest/globals": true
			},
			globals: {
				nsObj: false,
				jasmine: false
			}
		}
	]
};
