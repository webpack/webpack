import a from "./a";

it("should load a named chunk of an already available module", async () => {
	const lazy = await import(/* webpackChunkName: "named" */ "./a");
	expect(lazy.default).toBe(a);
});
