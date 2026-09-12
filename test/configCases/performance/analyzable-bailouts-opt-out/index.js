it("should stay quiet where the runtime form was asked for", () =>
	import("./lazy").then((lazy) => {
		expect(lazy.default).toBe("lazy");
		expect(__STATS__.warnings).toHaveLength(0);
		expect(__STATS__.hints).toHaveLength(0);
	}));
