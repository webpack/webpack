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

		// Ignore some folders
		"benchmark",
		"coverage",

		// Ignore generated files
		"*.check.js",

		// Ignore not supported files
		"**/*.d.ts",

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
			// TODO enable me in future
			"prefer-destructuring": "off"
		}
	},
	{
		files: ["lib/**/*.js"],
		extends: [getSharedConfig("webpack/special")]
	},
	getSharedConfig("webpack/schemas"),
	getSharedConfig("webpack/types"),
	getSharedConfig("webpack/comments"),
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
	},
	{
		// An example's commented-out config is what a reader copies, and its prose
		// is the example's own documentation — neither is commentary to shorten.
		files: ["examples/**/*.{js,cjs,mjs}"],
		rules: {
			"webpack/comment-length": "off"
		}
	},
	{
		files: ["lib/**/*.js"],
		rules: {
			// TODO drop once eslint-config-webpack#200 ships: the parser `webpack/types`
			// brings puts the TypeScript `lib` globals in scope, so a local `Cache` clashes
			"no-global-assign": "off",
			"no-redeclare": "off"
		}
	},
	{
		rules: {
			// Converting a re-exported `@typedef` to `@import` drops the re-export,
			// and that is webpack's public type surface in lib/index.js
			"webpack/prefer-import-tag": "off"
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
		ignores: ["hot/load-http.js"],
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
		// puppeteer-core and @puppeteer/browsers are ESM-only and are loaded via
		// dynamic import here
		files: ["test/helpers/launchBrowser.js"],
		languageOptions: {
			ecmaVersion: 2020
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
		files: [
			"setup/**/*.js",
			"tooling/**/*.js",
			"test/*.benchmark.mjs",
			"test/harness/benchmark/**/*.mjs",
			"test/benchmarkCases/**/webpack.config.mjs",
			"test/benchmarkCases/**/options.mjs",
			"test/benchmarkCases/**/index.bench.mjs"
		],
		languageOptions: {
			ecmaVersion: 2022
		},
		rules: {
			"no-console": "off"
		}
	},
	{
		// Fetches a browser for the suites that compare against one, from a package
		// that is ESM-only — so it runs on modern Node rather than the baseline.
		files: ["tooling/install-firefox.js"],
		languageOptions: {
			ecmaVersion: 2022
		},
		rules: {
			"n/no-unsupported-features/es-syntax": [
				"error",
				{
					ignores: ["dynamic-import"]
				}
			]
		}
	},
	{
		// The tool comparisons run on modern Node, not webpack's runtime baseline:
		// they measure with post-10 APIs (fs.promises, zstd, resourceUsage).
		files: [
			"tooling/compare-css-tools.js",
			"tooling/compare-html-tools.js",
			"tooling/compare-js-tools.js",
			"tooling/compare-tools-harness.js"
		],
		rules: {
			"n/no-unsupported-features/node-builtins": "off"
		}
	},
	{
		// The code generators run under the repo's own Node, not the baseline the
		// code they emit has to meet.
		files: ["tooling/generate-types.js", "tooling/type-coverage.js"],
		rules: {
			"n/no-unsupported-features/es-builtins": "off",
			"n/no-unsupported-features/es-syntax": "off",
			"n/no-unsupported-features/node-builtins": "off"
		}
	},
	{
		// Walking the TypeScript compiler's own AST: the checker hands back nodes
		// whose shape is only known once a kind has been tested for.
		files: ["tooling/generate-types.js"],
		rules: {
			"jsdoc/reject-any-type": "off"
		}
	},
	{
		// `color-name` is ESM, so the CSS data generator reaches its table through a
		// dynamic import rather than a `require` no jest `vm` supports.
		// `html-minifier-next` is ESM only and is imported the same way.
		files: ["tooling/generate-css-data.js", "tooling/compare-html-tools.js"],
		rules: {
			"n/no-unsupported-features/es-syntax": [
				"error",
				{
					ignores: ["error-cause", "dynamic-import"]
				}
			]
		}
	},
	{
		files: ["test/unitCases/Compiler-filesystem-caching.unittest.js"],
		languageOptions: {
			ecmaVersion: 2022
		}
	},
	{
		files: [
			"test/configCases/{dll-plugin-entry,dll-plugin-side-effects,dll-plugin}/**/webpack.config.js",
			"test/unitCases/NodeTemplatePlugin.unittest.js",
			"test/unitCases/PersistentCaching.unittest.js"
		],
		rules: {
			"import/extensions": "off",
			"import/no-unresolved": "off"
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
			"n/no-unsupported-features/es-syntax": "off"
		}
	},
	{
		files: ["examples/**/*.js"],
		rules: {
			"no-console": "off",

			// For examples purposes
			"n/no-unsupported-features/es-builtins": "off",
			"n/no-unsupported-features/es-syntax": "off",
			"n/no-unsupported-features/node-builtins": "off",

			"import/extensions": "off",
			"import/no-unresolved": "off",
			// examples reference `webpack` as the demonstrated package
			"import/no-extraneous-dependencies": "off"
		}
	},
	{
		// The parser keeps acorn's method and property names, since any acorn
		// plugin calls them by those names.
		files: ["lib/javascript/regexp.js", "lib/javascript/syntax-parser.js"],
		rules: {
			camelcase: "off"
		}
	},
	{
		files: [".changeset/**/*.mjs"],
		languageOptions: {
			ecmaVersion: 2025
		},
		settings: {
			// exports-only package, which the node resolver predates
			"import/core-modules": ["@changesets/get-github-info"]
		},
		rules: {
			"no-console": "off",
			"n/no-unsupported-features/node-builtins": "off"
		}
	}
]);
