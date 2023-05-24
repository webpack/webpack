it("should set fetchPriority", () => {
	import("./a");
	expect(document.head._children).toHaveLength(3);
	const script1 = document.head._children[1];
	expect(script1._attributes.fetchpriority).toBe("low");

	import("./b");
	expect(document.head._children).toHaveLength(4);
	const script2 = document.head._children[3];
	expect(script2._attributes.fetchpriority).toBe("low");

	import( "./c");
	expect(document.head._children).toHaveLength(5);
	const script3 = document.head._children[4];
	expect(script3._attributes.fetchpriority).toBe("auto");

	import(/* webpackPrefetch: 20, webpackFetchPriority: "auto" */ "./c");
});
