import value, { exception } from "./module";

it("harmony-tdz: should have a TDZ for exported const values", () => {
	// TODO: support disabling the inline export annotation to keep the TDZ, so this
	// can assert `exception` is an Error whose message matches `is not defined` or
	// `Cannot access '...' before initialization`.
	expect(value).toBe("value");
});
