it("should emit the entry under a hash that adds a directory", () => {
	const { assets } = __STATS__.children[__STATS_I__];
	expect(assets.some(({ name }) => /main\.Z\/It\.m?js$/.test(name))).toBe(true);
});

export const load = () => import("./lazy");
