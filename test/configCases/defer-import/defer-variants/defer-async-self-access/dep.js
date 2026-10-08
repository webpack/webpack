import defer * as ns from "./dep.js";

await Promise.resolve();

// Still evaluating-async at this point, so forcing the namespace must throw.
try {
	ns.foo;
} catch (error) {
	globalThis.deferAsyncSelfError = error;
}

export const foo = 1;
