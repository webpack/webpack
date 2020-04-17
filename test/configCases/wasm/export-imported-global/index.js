it("should export imported global", function() {
	return import("./module").then(function({ v, w, x, test }) {
		if (WebAssembly.Global) {
			expect(v.constructor).toBe(WebAssembly.Global);
			expect(w.constructor).toBe(WebAssembly.Global);
			expect(x.constructor).toBe(WebAssembly.Global);

			expect(+v).toBe(1);
			expect(+w).toBe(1);
			expect(+x).toBe(1.25);
		} else {
			expect(v).toBe(1);
			expect(w).toBe(1);
			expect(x).toBe(1.25);
		}
		expect(test()).toBe(2);
	});
});
