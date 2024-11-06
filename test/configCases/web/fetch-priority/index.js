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
	expect(script8._attributes.fetchpriority).toBeUndefined();

	import(/* webpackFetchPriority: "auto" */ "./g");
	expect(document.head._children).toHaveLength(9);
	const script9 = document.head._children[8];
	expect(script9._attributes.fetchpriority).toBe("auto");

	import(/* webpackFetchPriority: "unknown" */ "./h.js");
	expect(document.head._children).toHaveLength(10);
	const script10 = document.head._children[9];
	expect(script10._attributes.fetchpriority).toBeUndefined();

	import(/* webpackFetchPriority: "high" */ "./i");
	import(/* webpackFetchPriority: "low" */ "./i");
	expect(document.head._children).toHaveLength(11);
	const script11 = document.head._children[10];
	expect(script11._attributes.fetchpriority).toBe("high");

	import(/* webpackFetchPriority: "low" */ "./j");
	import(/* webpackFetchPriority: "high" */ "./j");
	expect(document.head._children).toHaveLength(12);
	const script12 = document.head._children[11];

	expect(script12._attributes.fetchpriority).toBe("low");
	import(/* webpackFetchPriority: "low" */ "./k");
	import("./e");
	import(/* webpackFetchPriority: "high" */ "./k");
	expect(document.head._children).toHaveLength(13);
	const script13 = document.head._children[12];
	expect(script13._attributes.fetchpriority).toBe("low");

	import(/* webpackFetchPriority: "high" */ "./style.css");
	expect(document.head._children).toHaveLength(14);
	const link1 = document.head._children[13];
	expect(link1._attributes.fetchpriority).toBe("high");

	import("./style-1.css");
	expect(document.head._children).toHaveLength(15);
	const link2 = document.head._children[14];
	expect(link2._attributes.fetchpriority).toBeUndefined();

	import(/* webpackFetchPriority: "low" */ "./style-2.css");
	expect(document.head._children).toHaveLength(16);
	const link3 = document.head._children[15];
	expect(link3._attributes.fetchpriority).toBe("low");
});
