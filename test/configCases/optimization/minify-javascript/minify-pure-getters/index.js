/**
 * @param {{ property?: number } | null} value a value, or null
 * @returns {number} one, where the unread property read is dropped
 */
function readsProperty(value) {
	value.property;
	return 1;
}

it("should drop a property read nothing reads, as `pure_getters` asks", () => {
	// Kept, the read of `null` would throw. A second call keeps the function
	// from inlining, where the read would name `null` and so stay.
	expect(readsProperty(null)).toBe(1);
	expect(readsProperty({ property: 2 })).toBe(1);
});
