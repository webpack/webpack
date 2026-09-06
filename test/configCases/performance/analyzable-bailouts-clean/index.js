const url = new URL("./file.txt", import.meta.url);

it("should stay quiet where every reference bakes", () =>
	import("./lazy").then((lazy) => {
		expect(url.href).toMatch(/\.txt$/);
		expect(lazy.default).toBe("lazy");
		expect(__STATS__.warnings).toHaveLength(0);
		expect(__STATS__.hints).toHaveLength(0);
	}));
