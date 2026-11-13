"use strict";

it("should keep each inlined entry module a separate statement", () => {
	expect(global.entrySeparatorRan).toBe(true);
	expect(global.entrySeparatorCalls).toBe(undefined);
});
