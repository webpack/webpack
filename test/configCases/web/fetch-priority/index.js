it("should set fetchPriority", () => {
	// Single Chunk
	import(/* webpackFetchPriority: "high" */ "./a");
	__non_webpack_require__("./a_js.js");
	expect(document.head._children).toHaveLength(1);
	const script1 = document.head._children[0];
	expect(script1._attributes.fetchpriority).toBe("high");

	// Multiple Chunks
	import(/* webpackFetchPriority: "high" */ "./b");
	import(/* webpackFetchPriority: "high" */ "./b2");
	__non_webpack_require__("./shared_js.js");
	__non_webpack_require__("./b_js.js");
	__non_webpack_require__("./b2_js.js");
	expect(document.head._children).toHaveLength(4);
	const script2 = document.head._children[1];
	const script3 = document.head._children[2];
	const script4 = document.head._children[3];
	expect(script2._attributes.fetchpriority).toBe("high");
	expect(script3._attributes.fetchpriority).toBe("high");
	expect(script4._attributes.fetchpriority).toBe("high");

	// Single Chunk, low
	import(/* webpackFetchPriority: "low" */ "./c");
	__non_webpack_require__("./c_js.js");
	expect(document.head._children).toHaveLength(5);
	const script5 = document.head._children[4];
	expect(script5._attributes.fetchpriority).toBe("low");

	// Single Chunk, auto
	import(/* webpackFetchPriority: "auto" */ "./d");
	__non_webpack_require__("./d_js.js");
	expect(document.head._children).toHaveLength(6);
	const script6 = document.head._children[5];
	expect(script6._attributes.fetchpriority).toBe("auto");

	// No fetch priority
	import("./e");
	expect(document.head._children).toHaveLength(7);
	const script7 = document.head._children[6];
	expect(script7._attributes.fetchpriority).toBeUndefined();
	__non_webpack_require__("./e_js.js");

	// Webpack context
	const loader = import.meta.webpackContext("./dir", {
		mode: "lazy",
	  fetchPriority: "high"
	});
	loader("./a");
	__non_webpack_require__("./dir_a_js.js");
	expect(document.head._children).toHaveLength(8);
	const script8 = document.head._children[7];
	expect(script8._attributes.fetchpriority).toBeUndefined();

	import(/* webpackFetchPriority: "auto" */ "./g");
	__non_webpack_require__("./g_js.js");
	expect(document.head._children).toHaveLength(9);
	const script9 = document.head._children[8];
	expect(script9._attributes.fetchpriority).toBe("auto");

	import(/* webpackFetchPriority: "unknown" */ "./h.js");
	__non_webpack_require__("./h_js.js");
	expect(document.head._children).toHaveLength(10);
	const script10 = document.head._children[9];
	expect(script10._attributes.fetchpriority).toBeUndefined();

	import(/* webpackFetchPriority: "high" */ "./i");
	import(/* webpackFetchPriority: "low" */ "./i");
	__non_webpack_require__("./i_js.js");
	expect(document.head._children).toHaveLength(11);
	const script11 = document.head._children[10];
	expect(script11._attributes.fetchpriority).toBe("high");

	import(/* webpackFetchPriority: "low" */ "./j");
	import(/* webpackFetchPriority: "high" */ "./j");
	__non_webpack_require__("./j_js.js");
	expect(document.head._children).toHaveLength(12);
	const script12 = document.head._children[11];
	expect(script12._attributes.fetchpriority).toBe("low");

	import(/* webpackFetchPriority: "low" */ "./k");
	import("./e");
	import(/* webpackFetchPriority: "high" */ "./k");
	__non_webpack_require__("./e_js.js");
	__non_webpack_require__("./k_js.js");
	expect(document.head._children).toHaveLength(13);
	const script13 = document.head._children[12];
	expect(script13._attributes.fetchpriority).toBe("low");

	const linkElement = window.document.createElement("link");
	linkElement.rel = "stylesheet";
	linkElement.href = "style_css.css";
	window.document.head.appendChild(linkElement);
	import(/* webpackFetchPriority: "high" */ "./style.css");
	__non_webpack_require__("./style_css.js");
	expect(document.head._children).toHaveLength(15);
	const link1 = document.head._children[14];
	expect(link1._attributes.fetchpriority).toBe("high");

	const linkElement1 = window.document.createElement("link");
	linkElement1.rel = "stylesheet";
	linkElement1.href = "style-1_css.css";
	window.document.head.appendChild(linkElement1);
	import("./style-1.css");
	__non_webpack_require__("./style-1_css.js");
	expect(document.head._children).toHaveLength(17);
	const link2 = document.head._children[16];
	expect(link2._attributes.fetchpriority).toBeUndefined();

	const linkElement2 = window.document.createElement("link");
	linkElement2.rel = "stylesheet";
	linkElement2.href = "style-2_css.css";
	window.document.head.appendChild(linkElement2);
	import(/* webpackFetchPriority: "low" */ "./style-2.css");
	__non_webpack_require__("./style-2_css.js");
	expect(document.head._children).toHaveLength(19);
	const link3 = document.head._children[18];
	expect(link3._attributes.fetchpriority).toBe("low");
});
