const load = () =>
	import(/* webpackChunkName: "packFullHash@@lazy" */ "./lazy");

it("should load a chunk whose name finishes a reserved name its public path starts", async () => {
	const { value } = await load();
	expect(value).toBe("lazy");
});
