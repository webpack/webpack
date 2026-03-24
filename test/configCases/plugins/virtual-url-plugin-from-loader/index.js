import { a, b } from "./source.js";

it("should load a virtual module registered by a loader (no pre-existing plugin)", () => {
	expect(a).toBe("registered-by-loader-a");
});

it("should load a virtual module registered by a different loader (cross-loader getPlugin access)", () => {
	expect(b).toBe("registered-by-loader-b");
});
