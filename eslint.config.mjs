import { defineConfig, globalIgnores } from "eslint/config";
import config from "eslint-config-webpack";
import configs from "eslint-config-webpack/configs.js";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Reads one config out of `eslint-config-webpack`, failing with the reason when
 * it has none under that name. Otherwise `defineConfig` reports the `undefined`
 * without naming what produced it.
 * @param {string} name name of a config `eslint-config-webpack` publishes
 * @returns {import("eslint").Linter.Config} the config published under that name
 */
function getSharedConfig(name) {
	const sharedConfig = configs[name];

	if (!sharedConfig) {
		throw new Error(
			`eslint-config-webpack publishes no "${name}" config. The installed one is older than the version package.json asks for — run \`yarn setup\`.`
		);
	}

	return sharedConfig;
}

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
		"!test/templates/*.js",
		"!test/specCases/*.js",
		"!test/benchmarkCases/**/*.mjs",
		// Only what these two directories hold directly: `runner/` and `snapshot/`
		// carry lint errors of their own, which are not this list's to unblock.
		"!test/harness/*.js",
		"!test/harness/runtimes/*.js",
		"!test/harness/benchmark/**/*.mjs",
		"!test/_helpers/**/*.mjs",
		"!test/runner/*.js",
		"test/js/**/*.*",
		"test/external/test262-cases/**/*.*",
		"test/external/wpt/**/*.*",
		"test/external/terser/**",
		"test/external/swc/**",
		"test/external/oxc/**",
		"test/external/xml-conformance-suite/**/*.*",

		// Ignore some folders
		"benchmark",
		"coverage",

		// Ignore generated files
		"*.check.js",

		// Ignore not supported files
		"**/*.d.ts",
		"**/*.d.json.ts",

		// Ignore precompiled schemas
		"schemas/**/*.check.js",

		// Auto generation
		"lib/sharing/semver.js",

		// Ignore some examples files
		"examples/**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx,md}",
		"!examples/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx,md}",
		"!examples/**/webpack.config.{js,cjs,mjs}",
		"!examples/**/test.filter.js",
		"!examples/**/internals/**/*.js"
	]),
	{
		ignores: ["lib/**/*.runtime.js", "hot/*.js"],
		extends: [config],
		rules: {
			// Too noise
			"jsdoc/require-property-description": "off",
			// Indents are used for imports
			"jsdoc/check-indentation": "off",
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

			// TODO Enable in future
			"prefer-destructuring": "off",
			"unicorn/prefer-single-object-destructuring": "off"
		}
	},
	getSharedConfig("webpack/special"),
	getSharedConfig("webpack/schemas"),
	getSharedConfig("webpack/comments"),
	{
		files: [
			"lib/css/data.js",
			"lib/javascript/data.js",
			"lib/javascript/syntax-printer-data.js"
		],
		rules: {
			// Keep the order emitted by the syntax data generators.
			"import-x/order": "off"
		}
	},
	{
		files: ["declarations/WebpackOptions.ts"],
		rules: {
			// Union order is part of the schema round trip.
			"unicorn/prefer-type-literal-last": "off"
		}
	},
	{
		files: [
			"lib/devtool/SourceMapDevToolPlugin.js",
			"lib/logging/ProgressPlugin.js"
		],
		settings: { jsdoc: { tagNamePreference: { instanceof: "instanceof" } } }
	},
	{
		// The minifiers require webpack itself, resolved again inside the worker
		files: ["lib/{css,html,javascript}/*Minify.js"],
		settings: {
			"import-x/core-modules": ["webpack"]
		}
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
		extends: [getSharedConfig("javascript/es5")],
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
		files: ["hot/load-http.js"],
		languageOptions: {
			ecmaVersion: 2022,
			globals: {
				...globals.browser
			}
		}
	},
	{
		rules: {
			"webpack/require-license-comment": "off"
		}
	},
	{
		files: ["test/**/*.{js,cjs,mjs}"],
		rules: {
			"unicorn/prefer-https": "off"
		}
	},
	{
		files: [
			"test/helpers/EventSourceForNode.js",
			"test/helpers/jsFuzzProgram.js"
		],
		rules: {
			"unicorn/prefer-minimal-ternary": "off"
		}
	},
	{
		files: ["tooling/generate-internal-serializables.js"],
		rules: {
			"unicorn/prefer-regexp-exec": "off"
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
			"jest/no-confusing-set-timeout": "off",

			"webpack/require-license-comment": "off"
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
		// The equivalence helpers are installed into the page, so they run in the
		// browser rather than in Node. So does what the color measurement hands to
		// `page.evaluate`.
		files: [
			"test/helpers/syntaxEquivalence.js",
			"tooling/measure-color-agreement.js"
		],
		languageOptions: {
			globals: {
				...globals.browser
			}
		}
	},
	{
		files: [
			"test/configCases/{dll-plugin-entry,dll-plugin-side-effects,dll-plugin}/**/webpack.config.js",
			"examples/dll-user/webpack.config.js",
			"test/unitCases/NodeTemplatePlugin.unittest.js",
			"test/unitCases/PersistentCaching.unittest.js"
		],
		rules: {
			"import-x/extensions": "off",
			"import-x/no-unresolved": "off"
		}
	},
	{
		files: [
			".changeset/**/*.mjs",
			".github/scripts/**/*.mjs",
			"examples/**/*.js",
			"setup/**/*.js",
			"tooling/**/*.js",
			"test/*.benchmark.mjs",
			"test/harness/benchmark/**/*.mjs",
			"test/benchmarkCases/**/webpack.config.mjs",
			"test/benchmarkCases/**/options.mjs",
			"test/benchmarkCases/**/index.bench.mjs"
		],
		languageOptions: {
			ecmaVersion: 2025,
			globals: {
				...globals.browser
			}
		},
		rules: {
			"no-console": "off",

			"n/no-unsupported-features/es-builtins": "off",
			"n/no-unsupported-features/es-syntax": "off",
			"n/no-unsupported-features/node-builtins": "off",

			"webpack/require-license-comment": "off",
			"webpack/comment-length": "off"
		}
	},
	{
		files: ["assembly/**/*.ts"],
		languageOptions: { parser: tseslint.parser, sourceType: "module" },
		rules: {
			eqeqeq: "off",
			"no-undef": "off",
			"no-loss-of-precision": "off",
			"new-cap": ["error", { capIsNew: false }],
			strict: "off",
			"n/no-unsupported-features/es-syntax": "off",
			"unicorn/no-constant-zero-expression": "off"
		}
	},
	{
		// The option sources `tooling/generate-schemas.js` derives the schemas from
		// are modules, and their comments are what a schema says rather than prose.
		files: ["declarations/**/*.ts"],
		languageOptions: { parser: tseslint.parser, sourceType: "module" },
		rules: {
			"webpack/comment-length": "off",
			// They declare types and emit nothing, so the runtime baseline is moot
			"n/no-unsupported-features/es-syntax": "off",
			// TypeScript resolves the names here, including the ambient ones
			"no-undef": "off",
			// The spellings are the ones the option takes, not ones to choose from
			"unicorn/text-encoding-identifier-case": "off"
		}
	}
]);
