import { defineConfig, globalIgnores } from "eslint/config";
import config from "eslint-config-webpack";
import configs from "eslint-config-webpack/configs.js";
import globals from "globals";

export default defineConfig([
	globalIgnores([
		// Ignore some test files
		"test/**/*.*",
		"!test/*.js",
		"!test/*.cjs",
		"!test/*.mjs",
		"!test/**/webpack.config.js",
		"!test/**/test.config.js",
		"!test/**/test.filter.js",
		"test/cases/parsing/es2022/test.filter.js",
		"!test/**/errors.js",
		"!test/**/warnings.js",
		"!test/**/deprecations.js",
		"!test/**/infrastructure-log.js",
		"!test/helpers/*.*",
		"!test/benchmarkCases/**/*.mjs",
		"!test/_helpers/**/*.mjs",
		"!test/runner/*.js",
		"test/js/**/*.*",

		// TODO fix me
		// This is not exactly typescript
		"assembly/**/*.ts",

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
		"examples/**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx,md}",
		"!examples/*/webpack.config.js"
	]),
	{
		ignores: ["lib/**/*.runtime.js", "hot/*.js"],
		extends: [config],
		rules: {
			// Too noise
			"jsdoc/require-property-description": "off",
			// We have helpers for the default configuration
			"new-cap": [
				"error",
				{
					newIsCapExceptions: [],
					capIsNewExceptions: ["A", "F", "D", "MODULES_GROUPERS"]
				}
			],
			// Revisit it in future
			"id-length": "off",
			// Revisit it in future
			"no-use-before-define": "off",

			// TODO We need allow to have `_arg` in tooling and use `after-used` value for `args`
			"no-unused-vars": [
				"error",
				{
					vars: "all",
					varsIgnorePattern: "^_",
					args: "none",
					argsIgnorePattern: "^_",
					caughtErrors: "all",
					caughtErrorsIgnorePattern: "^_",
					destructuredArrayIgnorePattern: "^_",
					ignoreRestSiblings: true,
					ignoreClassWithStaticInitBlock: false,
					reportUsedIgnorePattern: false
				}
			],
			// TODO enable me in future
			"prefer-destructuring": "off"
		}
	},
	{
		files: ["lib/**/*.js"],
		extends: [configs["webpack/special"]]
	},
	{
		files: ["bin/**/*.js"],
		// Allow to use `dynamic` import
		languageOptions: {
			ecmaVersion: 2020
		},
		rules: {
			"no-console": "off",

			// Allow to use `dynamic` import and hashbang
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
		extends: [configs["javascript/es5"]],
		languageOptions: {
			sourceType: "commonjs",
			globals: {
				...globals.browser,
				...globals.es5,
				Promise: false,
				Map: false,
				Set: false,
				process: false
			}
		},
		rules: {
			strict: "off",

			"block-scoped-var": "off",

			// Allow logging
			"no-console": "off",

			// We replace `$VAR$` on real code
			"no-unused-vars": "off",
			"no-undef-init": "off",

			"id-length": "off",

			"jsdoc/require-jsdoc": "off",

			// Revisit it in future
			"no-use-before-define": "off",
			"func-names": "off",
			"func-style": "off"
		}
	},
	{
		files: ["test/**/*.js"],
		rules: {
			// Some our tests contain `package.json` without `engines`, but tests should work on Node.js@10, so let's disable it
			"n/prefer-node-protocol": "off",

			// No need here, we have custom test logic, so except can be placed in different places
			"jest/no-standalone-expect": "off",

			// We have a lot of custom tests
			"jest/expect-expect": "off",

			// We have a lot of custom tests
			"jest/no-confusing-set-timeout": "off"
		}
	},
	{
		files: ["test/helpers/**/*.{js,cjs,mjs}"],
		languageOptions: {
			globals: {
				...globals.jest
			}
		},
		rules: {
			"no-eval": "off",
			"no-console": "off",

			// Allow to use any builtins, syntax and node API in tests
			"n/no-unsupported-features/es-builtins": "off",
			"n/no-unsupported-features/es-syntax": "off",
			"n/no-unsupported-features/node-builtins": "off"
		}
	},
	{
		files: ["test/**/*.mjs"],
		languageOptions: {
			ecmaVersion: 2022
		}
	},
	{
		files: ["setup/**/*.js", "tooling/**/*.js"],
		languageOptions: {
			ecmaVersion: 2022
		},
		rules: {
			"no-console": "off"
		}
	},
	{
		files: ["test/Compiler-filesystem-caching.test.js"],
		languageOptions: {
			ecmaVersion: 2022
		}
	},
	{
		files: [
			"test/configCases/{dll-plugin-entry,dll-plugin-side-effects,dll-plugin}/**/webpack.config.js",
			"test/NodeTemplatePlugin.test.js",
			"test/PersistentCaching.test.js"
		],
		rules: {
			"import/extensions": "off",
			"import/no-unresolved": "off"
		}
	},

	{
		files: ["examples/**/*.js"],
		rules: {
			// For examples purposes
			"n/no-unsupported-features/es-builtins": "off",
			"n/no-unsupported-features/es-syntax": "off",
			"n/no-unsupported-features/node-builtins": "off",

			"import/extensions": "off",
			"import/no-unresolved": "off"
		}
	}
]);
