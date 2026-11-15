it("should match a pattern whose braces expand to many globs", () => {
	const modules = import.meta.glob("./dir/{a,z}{,y}{,y}{,y}{,y}{,y}{,y}{,y}{,y}{,y}.js", { eager: true });
	expect(Object.keys(modules)).toEqual(["./dir/a.js"]);
	expect(modules["./dir/a.js"].default).toBe("a");
});

it("should match nothing when the braces of a pattern expand to too many globs", () => {
	const modules = import.meta.glob("./dir/{a,b}{a,b}{a,b}{a,b}{a,b}{a,b}{a,b}{a,b}{a,b}{a,b}{a,b}{a,b}{a,b}{a,b}{a,b}{a,b}{a,b}{a,b}{a,b}{a,b}{a,b}{a,b}{a,b}{a,b}.js", { eager: true });
	expect(Object.keys(modules)).toEqual([]);
});
