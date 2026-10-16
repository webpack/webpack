// The free `counter` other modules read is a global, set before the library runs
globalThis.counter = "global";
const loading = import("./library.mjs");

it("should keep exported bindings live, whatever their name or position", async () => {
	const library = await loading;
	expect([library.counter, library.length, library.early, library.visible]).toEqual([0, 0, 1, 2]);
	library.bump();
	expect([library.counter, library.length, library.early, library.visible]).toEqual([1, 1, 2, 3]);
	expect(library.snapshot()).toEqual({ counter: 1, length: 1 });
	expect(library.readCommonJs()).toBe(1);
});

it("should keep a free global of another module unshadowed", async () => {
	const library = await loading;
	expect(library.readGlobals()).toEqual(["global", "global"]);
	expect(library.readAlias()).toEqual([library.counter, "string"]);
});

it("should keep same-named bindings of two modules apart", async () => {
	const library = await loading;
	expect([library.shared, library.other]).toEqual(["a", "b"]);
	library.setA("A");
	library.setB("B");
	expect([library.shared, library.other]).toEqual(["A", "B"]);
});

it("should name an anonymous function after the binding it is assigned to", async () => {
	const library = await loading;
	expect(library.callable.name).toBe("callable");
	library.replace();
	expect(library.callable.name).toBe("callable");
});

it("should keep a `var` live wherever the module declares it again", async () => {
	const library = await loading;
	expect([library.tally, library.first, library.second]).toEqual([2, 1, 2]);
	// declared again beside another name, the two move together
	expect(library.mixed).toBe(4);
	library.bumpVariables();
	expect([library.tally, library.first, library.second]).toEqual([3, 5, 2]);
	expect(library.mixed).toBe(5);
});

it("should keep destructured, function and class exports live", async () => {
	const library = await loading;
	expect(library.greetedEarly).toBe("hello");
	expect([library.left, library.up]).toEqual([1, 2]);
	// the minifier renames a destructured binding even with `keep_fnames`, as on main
	if (!MINIFIED) expect(library.right.name).toBe("right");
	expect([library.greet.name, library.Shape.name]).toEqual(["greet", "Shape"]);
	library.changeDeclarations();
	expect(library.greet()).toBe("bye");
	expect([library.greet.name, library.Shape.name]).toEqual(["greet", "Square"]);
	expect([library.left, library.right, library.up]).toEqual([2, null, 3]);
	expect(library.unchanged()).toBe(1);
});

it("should leave a `var` the walk renames elsewhere a correct copy", async () => {
	const library = await loading;
	expect(library.aliased).toBe(URL);
});
