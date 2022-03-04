const a = String.fromCharCode("a".charCodeAt(0));
const b = String.fromCharCode("b".charCodeAt(0));

it("should compile correctly", async () => {
	expect((await /* webpackMode: "lazy" */ import(`foo/${a}`)).default).toEqual({});
	expect((await /* webpackMode: "lazy" */ import(`foo/${b}`)).default).toBe("b");
});
