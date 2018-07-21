module.exports = {
	"root": true,
	"plugins": ["node"],
	"extends": ["eslint:recommended", "plugin:node/recommended"],
	"env": {
		"node": true,
		"es6": true,
	},
	"parserOptions": { "ecmaVersion": 2017 },
	"rules": {
		"quotes": ["error", "double"],
		"no-undef": "error",
		"no-extra-semi": "error",
		"semi": "error",
		"no-template-curly-in-string": "error",
		"no-caller": "error",
		"yoda": "error",
		"eqeqeq": "error",
		"global-require": "off",
		"brace-style": "error",
		"eol-last": "error",
		"no-extra-bind": "warn",
		"no-empty": "off",
		"no-multiple-empty-lines": "error",
		"no-multi-spaces": "error",
		"no-process-exit": "warn",
		"space-in-parens": "error",
		"no-trailing-spaces": "error",
		"no-use-before-define": "off",
		"no-unused-vars": ["error", { "args": "none" }],
		"key-spacing": "error",
		"space-infix-ops": "error",
		"no-unsafe-negation": "error",
		"no-loop-func": "warn",
		"space-before-function-paren": ["error", "never"],
		"space-before-blocks": "error",
		"object-curly-spacing": ["error", "always"],
		"indent": "off",
		"keyword-spacing": ["error", {
			"after": false,
			"overrides": {
				"const": { "after": true },
				"try": { "after": true },
				"else": { "after": true },
				"throw": { "after": true },
				"case": { "after": true },
				"return": { "after": true },
				"finally": { "after": true },
				"do": { "after": true }
			}
		}],
		"no-console": "off",
		"valid-jsdoc": "error",
		"node/no-unsupported-features": ["error", { version: 4 }],
		"node/no-deprecated-api": "error",
		"node/no-missing-import": "error",
		"node/no-missing-require": [
			"error",
			{
				"allowModules": [
					"webpack"
				]
			}
		],
		"node/no-unpublished-bin": "error",
		"node/no-unpublished-require": "error",
		"node/process-exit-as-throw": "error"
	}
};
