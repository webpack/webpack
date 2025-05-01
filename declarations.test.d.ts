declare module "*.json";

type Env = Record<string, any>;
type TestOptions = { testPath: string, srcPath: string };

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
