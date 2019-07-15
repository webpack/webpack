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
		ecmaVersion: 2017
	},
	rules: {
		"prettier/prettier": "error",
		"no-undef": "error",
		"no-extra-semi": "error",
		"no-template-curly-in-string": "error",
		"no-caller": "error",
		"no-control-regex": "off",
		yoda: "error",
		eqeqeq: "error",
		"global-require": "off",
		"brace-style": "off",
		"eol-last": "error",
		"no-extra-bind": "warn",
		"no-process-exit": "warn",
		"no-use-before-define": "off",
		"no-unused-vars": ["error", { args: "none" }],
		"no-unsafe-negation": "error",
		"no-loop-func": "warn",
		indent: "off",
		"no-console": "off",
		"valid-jsdoc": [
			"error",
			{
				prefer: {
					return: "returns",
					prop: "property",
					memberof: "DONTUSE",
					class: "DONTUSE",
					inheritdoc: "DONTUSE",
					description: "DONTUSE",
					readonly: "DONTUSE"
				},
				preferType: {
					"*": "any"
				},
				requireReturnType: true
			}
		],
		"node/no-unsupported-features": "error",
		"node/no-deprecated-api": "error",
		"node/no-missing-import": "error",
		"node/no-missing-require": ["error", { allowModules: ["webpack"] }],
		"node/no-unpublished-bin": "error",
		"node/no-unpublished-require": "error",
		"node/process-exit-as-throw": "error",
		"jsdoc/require-hyphen-before-param-description": ["error", "never"],
		"jsdoc/check-tag-names": "error"
	},
	settings: {
		jsdoc: {
			// supported tags https://github.com/microsoft/TypeScript-wiki/blob/master/JSDoc-support-in-JavaScript.md
			tagNamePreference: {
				...(['implements', 'const', 'memberof', 'readonly', 'yields'].reduce((acc, tag) => {
					acc[tag] = {
						message: `@${tag} currently not supported in Typescript`
					};
					return acc;
				}, {})),
				extends: "extends",
				constructor: "constructor"
			}
		}
	},
	overrides: [
		{
			files: ["lib/**/*.runtime.js", "buildin/*.js", "hot/*.js"],
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
				nsObj: false
			}
		}
	]
};
