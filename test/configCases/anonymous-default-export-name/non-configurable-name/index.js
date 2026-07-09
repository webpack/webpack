import {
	originalDefineProperty,
	originalGetOwnPropertyDescriptor
} from "./simulate-pre-es2015-name";
import value from "./dep";

Object.getOwnPropertyDescriptor = originalGetOwnPropertyDescriptor;
Object.defineProperty = originalDefineProperty;

it("should not throw when a function's name property is non-configurable (pre-ES2015 engines)", () => {
	// Regression test for https://github.com/webpack/webpack/issues/21369
	// On pre-ES2015 engines (e.g. Chrome <= 42) a function's `name` property is
	// non-writable AND non-configurable, so the anonymous-default `.name`
	// fix-up must be skipped instead of letting `Object.defineProperty` throw
	// and take down the whole bundle evaluation.
	expect(typeof value).toBe("function");
	expect(value()).toBe(42);
});
