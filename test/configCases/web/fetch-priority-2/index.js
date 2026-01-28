it("should set fetchPriority", async () => {
	import(/* webpackFetchPriority: "high" */ "./a");
	__non_webpack_require__("./a_js.js");
	expect(document.head._children).toHaveLength(4);
	const script1 = document.head._children[2];
	expect(script1._attributes.fetchpriority).toBe("high");

	import(/* webpackFetchPriority: "low" */ "./b");
	__non_webpack_require__("./b_js.js");
	expect(document.head._children).toHaveLength(5);
	const script2 = document.head._children[4];
	expect(script2._attributes.fetchpriority).toBe("low");

	import(/* webpackFetchPriority: "low" */ "./c");
	expect(document.head._children).toHaveLength(6);
	const script3 = document.head._children[5];
	expect(script3._attributes.fetchpriority).toBe("low");

	import(/* webpackPrefetch: 20, webpackFetchPriority: "auto" */ "./c");
	__non_webpack_require__("./c_js.js");

	import("./d");
	__non_webpack_require__("./d2_js.js");
	__non_webpack_require__("./d1_js.js");
	__non_webpack_require__("./d_js.js");
	expect(document.head._children).toHaveLength(7);
	const script4 = document.head._children[6];
	expect(script4._attributes.fetchpriority).toBeUndefined();

	import(/* webpackPrefetch: -20 */ "./d3");
	__non_webpack_require__("./d3_js.js");
	expect(document.head._children).toHaveLength(8);
	const script5 = document.head._children[7];
	expect(script5._attributes.fetchpriority).toBeUndefined();

	const condition = true;

	if (!condition) {
		import(/* webpackFetchPriority: "high", webpackChunkName: "one" */ "./e");
		expect(document.head._children).toHaveLength(9);
		const script6 = document.head._children[8];
		expect(script6._attributes.fetchpriority).toBe("high");
	} else {
		import(/* webpackFetchPriority: "low", webpackChunkName: "two" */ "./e");
		__non_webpack_require__("./one.js");
		expect(document.head._children).toHaveLength(9);
		const script6 = document.head._children[8];
		expect(script6._attributes.fetchpriority).toBe("low");
	}
});
