it("should set fetchPriority", () => {
	import("./a");
	expect(document.head._children).toHaveLength(1);
	const script1 = document.head._children[0];
	expect(script1._attributes.fetchpriority).toBe("low");

	import("./b");
	expect(document.head._children).toHaveLength(2);
	const script2 = document.head._children[1];
	expect(script2._attributes.fetchpriority).toBe("low");

	import(/* webpackFetchPriority: "high" */ "./c");
	expect(document.head._children).toHaveLength(3);
	const script3 = document.head._children[2];
	expect(script3._attributes.fetchpriority).toBe("high");
});
