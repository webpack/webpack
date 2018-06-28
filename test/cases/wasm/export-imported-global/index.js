it("should export imported global", function() {
	return import("./module").then(function({ v, w, x, test }) {
		expect(v).toBe(1);
		expect(w).toBe(1);
		expect(x).toBe(1.25);
		expect(test()).toBe(2);
	});
});
