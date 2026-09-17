import { read, value } from "./state";

function writeDestructured() {
	({ value } = { value: 2 });
}

it("should reject a destructuring write to an imported binding", () => {
	expect(writeDestructured).toThrow();
	expect(read()).toBe(1);
	expect(value).toBe(1);
});

it("should keep the writing module out of concatenation", () => {
	expect(__STATS__.modules.filter((m) => m.modules)).toHaveLength(0);
});
