import * as root from "./m0.js";

it("should resolve namespace re-export chains to the module read", () => {
	expect(root.value).toBe("m0");
	expect(root.m1.m2.m3.m4.value).toBe("m4");
	expect(root.m7.m6.m5.m4.m3.m2.value).toBe("m2");
	expect(root.m3.m0.m3.m0.value).toBe("m0");
});

it("should leave out every module the chains only pass through", () => {
	const names = new Set();
	for (const module of __STATS__.modules) {
		if (module.chunks.length === 0) continue;
		for (const inner of module.modules || [module]) names.add(inner.name);
	}
	const sources = [...names].filter((name) => /\.\/m\d\.js$/.test(name)).sort();
	expect(sources).toEqual(["./m0.js", "./m2.js", "./m4.js"]);
});
