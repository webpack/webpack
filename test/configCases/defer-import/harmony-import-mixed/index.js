import { value as directValue } from "./shared.js";  // non-defer import
import * as deferredShared from /* webpackDefer: true */ "./shared.js";  // defer import

it("should handle mixed defer/non-defer targets correctly", () => {
	// Test direct non-defer access
	expect(typeof directValue).toBe("string");
	expect(directValue).toBe("shared-value");
	
	// Test deferred access
	expect(typeof deferredShared).toBe("object");
	expect(deferredShared).not.toBe(null);
	expect(deferredShared.value).toBe("shared-value");
	
	// Both should access the same underlying value
	expect(directValue).toBe(deferredShared.value);
}); 