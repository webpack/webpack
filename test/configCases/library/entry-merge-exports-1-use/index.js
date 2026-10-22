import * as library from "library";

it(`should read every entry module's exports back out of the library (${TYPE})`, () => {
	expect(library.fromA).toBe("a");
	expect(library.fromB).toBe("b");
});

it(`should keep a name the entry modules take from one binding (${TYPE})`, () => {
	expect(library.fromBoth).toBe("both");
});

// Read off the namespace rather than imported by name, which would only warn.
it(`should leave out a name the entry modules bind differently (${TYPE})`, () => {
	expect(Object.keys(library)).not.toContain("shared");
});
