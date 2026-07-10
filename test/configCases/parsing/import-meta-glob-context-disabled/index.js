const modules = import.meta.glob("./mods/*.js", { eager: true });

it("keeps import.meta.glob working when importMetaContext is disabled", () => {
	expect(Object.keys(modules).sort()).toEqual(["./mods/a.js", "./mods/b.js"]);
	expect(modules["./mods/a.js"].default).toBe("a");
	expect(modules["./mods/b.js"].default).toBe("b");
});
