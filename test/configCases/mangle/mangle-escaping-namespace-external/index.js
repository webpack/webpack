import { getProvider } from "./wrapper";

it("should access all exports via the escaped namespace with mangled multi-char names", () => {
	const ns = getProvider();
	for (let i = 0; i < 60; i++) {
		const key = `e${String(i).padStart(2, "0")}`;
		const expected = `v${String(i).padStart(2, "0")}`;
		expect(ns[key]).toBe(expected);
	}
});
