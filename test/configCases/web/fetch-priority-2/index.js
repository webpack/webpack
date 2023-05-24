it("should set fetchPriority", () => {
	import("./a");
	import("./b");

	expect(document.head._children).toHaveLength(2);
	const script1 = document.head._children[1];
	expect(script1._attributes.fetchpriority).toBe("low");

	import(/* webpackPrefetch: true */ "./c");
	expect(document.head._children).toHaveLength(3);
	const script2 = document.head._children[2];
	expect(script2._attributes.fetchpriority).toBe("high");
});
