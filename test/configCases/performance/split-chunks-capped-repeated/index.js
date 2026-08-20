it("should report each refused split once, however often it is reconsidered", () =>
	Promise.all([import("./p0"), import("./p1"), import("./p2")]).then(
		([p0, p1, p2]) => {
			expect(p0.default).toBe("l1l2");
			expect(p1.default).toBe("l1l3");
			expect(p2.default).toBe("l2l4");
		}
	));
