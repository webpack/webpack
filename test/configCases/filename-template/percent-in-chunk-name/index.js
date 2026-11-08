it("should load a chunk whose name holds a percent sign", () =>
	import(/* webpackChunkName: "a b%41" */ "./value").then((module) => {
		expect(module.default).toBe(42);
	}));

it("should keep the percent sign in the chunk file name", () => {
	const { chunks } = __STATS__.children[__STATS_I__];
	const chunk = chunks.find((chunk) => chunk.names.includes("a b%41"));
	expect(chunk.files.some((file) => file.includes("a b%41"))).toBe(true);
});

if (CSS) {
	it("should load a stylesheet whose chunk name holds a percent sign", () =>
		import(/* webpackChunkName: "c%42" */ "./styled").then((module) => {
			expect(module.default).toBe("styled");
			const links = Array.from(document.getElementsByTagName("link"));
			const link = links.find((link) => /c%2542/.test(link.href));
			expect(link).toBeDefined();
			expect(link.sheet.css).toContain(".percent-chunk");
		}));
}
