declare module "*.json";
declare module "mini-css-extract-plugin";

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
