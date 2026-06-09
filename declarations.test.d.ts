declare module "*.json";

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
