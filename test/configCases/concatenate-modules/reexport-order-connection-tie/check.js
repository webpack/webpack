import { a, b } from "./index.js";

it("re-exports through a side-effect-free barrel", () => {
	expect(a()).toBe("a");
	expect(b()).toBe("b");
});
