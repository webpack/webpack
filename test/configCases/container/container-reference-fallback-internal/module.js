import abc from "abc/hello-world";

export function test() {
	// The real external "ABC" resolves through the registered request; before the
	// fix its request name was shifted by the leading `internal ` entry and the
	// build failed to resolve it.
	expect(abc).toBe("abc ./hello-world");
}
