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
});

it("should name an anonymous function after the binding it is assigned to", async () => {
	const library = await loading;
	expect(library.callable.name).toBe("callable");
	library.replace();
	expect(library.callable.name).toBe("callable");
});
