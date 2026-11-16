/**
 * @param {{ property?: number } | null} value a value, or null
 * @returns {number} one, where the unread property read is dropped
 */
function readsProperty(value) {
	value.property;
	return 1;
}

it("should drop a property read nothing reads, as `pure_getters` asks", () => {
	// Kept, the read of `null` would throw.
	expect(readsProperty(null)).toBe(1);
});
