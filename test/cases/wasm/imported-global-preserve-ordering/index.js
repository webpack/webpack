it("should preserve the ordering of globals", function() {
	return import("./module.wat").then(function(e) {
		if (WebAssembly.Global) {
			expect(e.c.constructor).toBe(WebAssembly.Global);
			expect(e.d.constructor).toBe(WebAssembly.Global);

			expect(+e.c).toBe(3);
			expect(+e.d).toBe(4);
		} else {
			expect(e.c).toBe(3);
			expect(e.d).toBe(4);
		}
	});
});
