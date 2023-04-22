it("should set fetchPriority", () => {
	// Single Chunk
	import(/* webpackFetchPriority: "high" */ "./a");
	expect(document.head._children).toHaveLength(1);
	const script1 = document.head._children[0];
	expect(script1._attributes.fetchpriority).toBe("high");

	// Multiple Chunks
	import(/* webpackFetchPriority: "high" */ "./b");
	import(/* webpackFetchPriority: "high" */ "./b2");
	expect(document.head._children).toHaveLength(4);
	const script2 = document.head._children[1];
	const script3 = document.head._children[2];
	const script4 = document.head._children[3];
	expect(script2._attributes.fetchpriority).toBe("high");
	expect(script3._attributes.fetchpriority).toBe("high");
	expect(script4._attributes.fetchpriority).toBe("high");

	// Single Chunk, low
	import(/* webpackFetchPriority: "low" */ "./c");
	expect(document.head._children).toHaveLength(5);
	const script5 = document.head._children[4];
	expect(script5._attributes.fetchpriority).toBe("low");

	// Single Chunk, auto
	import(/* webpackFetchPriority: "auto" */ "./d");
	expect(document.head._children).toHaveLength(6);
	const script6 = document.head._children[5];
	expect(script6._attributes.fetchpriority).toBe("auto");

	// No fetch priority
	import("./e");
	expect(document.head._children).toHaveLength(7);
	const script7 = document.head._children[6];
	expect(script7._attributes.fetchpriority).toBeUndefined();

	// Webpack context
	const loader = import.meta.webpackContext("./dir", {
		mode: "lazy",
		fetchPriority: "high"
	});
	loader("./a");
	expect(document.head._children).toHaveLength(8);
	const script8 = document.head._children[7];
	expect(script8._attributes.fetchpriority).toBe("high");
})
