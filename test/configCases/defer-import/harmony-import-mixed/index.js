import { value as directValue } from "./shared.js";  // non-defer import
import * as deferredShared from /* webpackDefer: true */ "./shared.js";  // defer import

import { value as directValueAsync } from "./shared-async.js";  // non-defer import
import * as deferredSharedAsync from /* webpackDefer: true */ "./shared-async.js"; // defer import

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

it("should handle mixed defer/non-defer targets with async correctly", () => {
	// Test direct non-defer access
	expect(typeof directValueAsync).toBe("string");
	expect(directValueAsync).toBe("shared-value-async");

	// Test deferred access
	expect(deferredSharedAsync).not.toBeInstanceOf(Promise);
	((m) => {
		expect(m.value).toBe("shared-value-async");
	})(deferredSharedAsync);

	// Both should access the same underlying value
	expect(directValueAsync).toBe(deferredSharedAsync.value);
});
