function abortable(fn) {
	return new Promise((resolve) => {
		const timeoutId = setTimeout(() => {
			console.log("HERE")
			fn = undefined;
			resolve('Promise resolved after delay');
			clearTimeout(timeoutId);
		}, 1000);

		return fn();
	});
}

it("should set fetchPriority", async () => {
	abortable(() => import(/* webpackFetchPriority: "high" */ "./a"));
	expect(document.head._children).toHaveLength(4);
	const script1 = document.head._children[2];
	expect(script1._attributes.fetchpriority).toBe("high");

	abortable(() => import(/* webpackFetchPriority: "low" */ "./b"));
	expect(document.head._children).toHaveLength(5);
	const script2 = document.head._children[4];
	expect(script2._attributes.fetchpriority).toBe("low");

	abortable(() => import(/* webpackFetchPriority: "low" */ "./c"));
	expect(document.head._children).toHaveLength(6);
	const script3 = document.head._children[5];
	expect(script3._attributes.fetchpriority).toBe("low");

	abortable(() => import(/* webpackPrefetch: 20, webpackFetchPriority: "auto" */ "./c"));

	abortable(() => import("./d"))
	expect(document.head._children).toHaveLength(7);
	const script4 = document.head._children[6];
	expect(script4._attributes.fetchpriority).toBeUndefined();

	abortable(() => import(/* webpackPrefetch: -20 */ "./d3"));
	expect(document.head._children).toHaveLength(8);
	const script5 = document.head._children[7];
	expect(script5._attributes.fetchpriority).toBeUndefined();

	const condition = true;

	if (!condition) {
		abortable( () => import(/* webpackFetchPriority: "high", webpackChunkName: "one" */ "./e"));
		expect(document.head._children).toHaveLength(9);
		const script6 = document.head._children[8];
		expect(script6._attributes.fetchpriority).toBe("high");
	} else {
		abortable(() => import(/* webpackFetchPriority: "low", webpackChunkName: "two" */ "./e"));
		expect(document.head._children).toHaveLength(9);
		const script6 = document.head._children[8];
		expect(script6._attributes.fetchpriority).toBe("low");
	}
});
