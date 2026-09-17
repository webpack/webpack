import {
	originalDefineProperty,
	originalGetOwnPropertyDescriptor
} from "./simulate-pre-es2015-name";
import value from "./dep";

Object.getOwnPropertyDescriptor = originalGetOwnPropertyDescriptor;
Object.defineProperty = originalDefineProperty;

it("should not throw when a function's name property is non-configurable (pre-ES2015 engines)", () => {
	// Regression test for #21369. On pre-ES2015 engines a function's `name` is
	// non-writable and non-configurable, so the anonymous-default `.name` fix-up must
	// be skipped rather than letting `Object.defineProperty` throw.
	expect(typeof value).toBe("function");
	expect(value()).toBe(42);
});
