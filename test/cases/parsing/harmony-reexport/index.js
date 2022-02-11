import { a, aUsed, aCanBeMangled, aProvided } from "./reexport";

if (a()) console.log("a");

it("should not allow mangle if some exports are unknown", () => {
	expect(aUsed).toBe(true);
	expect(aProvided).toBe(true);
	expect(aCanBeMangled).toBe(false);
});
