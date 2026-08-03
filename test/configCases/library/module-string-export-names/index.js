import { named } from "./dep";

const local = "local";

it("should emit a runnable bundle for arbitrary module namespace names", () => {
	expect(local).toBe("local");
	expect(named).toBe("named");
});

export { local as "str name" };
export { named as "re str" } from "./dep";
export * as "ns name" from "./dep";
export * from "./nested";
