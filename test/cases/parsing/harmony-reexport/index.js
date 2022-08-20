import { a, aUsed, aCanBeMangled, aProvided, aToStringProvided, obj, objUsed, objAProvided } from "./reexport";

if (a()) console.log("a", obj);

it("should not allow mangle if some exports are unknown", () => {
	expect(aUsed).toBe(true);
	expect(aProvided).toBe(true);
	expect(aCanBeMangled).toBe(false);
	expect(objUsed).toBe(true);
	expect(objAProvided).toBe(undefined);
	expect(aToStringProvided).toBe(undefined);
});
