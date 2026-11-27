const load = () =>
	import(/* webpackChunkName: "@webpackFullHash@@lazy" */ "./lazy");

it("should load a chunk whose name and public path only spell a reserved name together", async () => {
	const { value } = await load();
	expect(value).toBe("lazy");
});
