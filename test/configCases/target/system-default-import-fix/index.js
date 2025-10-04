import React, { useEffect } from "react";

/* This test verifies that default imports work correctly with SystemJS externals
 * when the external module doesn't have a default property (e.g., React)
 */

it("should correctly handle default import from SystemJS external", function() {
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
