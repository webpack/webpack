declare module "*.json";

// optional peer of webpack-cli, not installed
declare module "webpack-dev-server";

// only required by a few CSS test cases; ships no types
declare module "less";
declare module "less-loader";

// the reference implementation ScopeAnalyzerParity.unittest.js compares
// lib/javascript/ScopeAnalyzer.js against; ships no types, and the published
// ones describe the v5 API webpack used before the replacement
declare module "eslint-scope" {
	interface EslintScope {
		type: string;
		block: import("estree").Node;
		upper: EslintScope | null;
		childScopes: EslintScope[];
		variables: EslintVariable[];
		through: EslintReference[];
	}

	interface EslintVariable {
		name: string;
		identifiers: import("estree").Identifier[];
		references: EslintReference[];
		scope: EslintScope;
	}

	interface EslintReference {
		identifier: import("estree").Identifier;
		from: EslintScope;
		resolved: EslintVariable | null;
	}

	function analyze(
		ast: import("estree").Program,
		options?: Record<string, unknown>
	): { globalScope: EslintScope };
}

type Env = Record<string, any>;
type TestOptions = { testPath: string; srcPath: string };

// jest-circus internal state, exposed on `global` by test/patch-node-env.js
// eslint-disable-next-line no-var
declare var JEST_STATE_SYMBOL: import("@jest/types").Circus.State;

declare namespace jest {
	interface Matchers<R> {
		toBeTypeOf: (
			expected:
				| "string"
				| "number"
				| "bigint"
				| "boolean"
				| "symbol"
				| "undefined"
				| "object"
				| "function"
		) => void;
		toEndWith: (expected: string) => void;
	}
}
