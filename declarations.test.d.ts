declare module "*.json";

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
