it("should set fetchPriority", () => {
	// Single Chunk
	import("./a");
	import("./b");

	expect(document.head._children).toHaveLength(2);
	const script1 = document.head._children[1];
	expect(script1._attributes.fetchpriority).toBe("low");
})
