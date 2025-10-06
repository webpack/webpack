import React, { useEffect } from "react";
import ReactWithDefault, { useEffect as useEffectWithDefault } from "react-with-default";

/* This test verifies that default imports work correctly with SystemJS externals
 * in both scenarios:
 * 1. External module without default property (traditional SystemJS)
 * 2. External module with default property (ES6 module format)
 */

it("should correctly handle default import from SystemJS external without default property", function() {
	// React should be the entire module object, not undefined
	expect(React).toBeDefined();
	expect(typeof React).toBe("object");
	expect(React.Component).toBeDefined();
	expect(React.Fragment).toBeDefined();
	
	// Named imports should still work
	expect(typeof useEffect).toBe("function");
	
	// The default import should not be undefined
	expect(React).not.toBeUndefined();
});

it("should correctly handle default import from SystemJS external with default property", function() {
	// ReactWithDefault should be the default property value
	expect(ReactWithDefault).toBeDefined();
	expect(typeof ReactWithDefault).toBe("object");
	expect(ReactWithDefault.Component).toBeDefined();
	expect(ReactWithDefault.Fragment).toBeDefined();
	
	// Named imports should still work
	expect(typeof useEffectWithDefault).toBe("function");
	
	// The default import should not be undefined
	expect(ReactWithDefault).not.toBeUndefined();
});
