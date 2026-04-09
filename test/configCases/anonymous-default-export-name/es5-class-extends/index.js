import Derived from "./Derived";

it("should handle anonymous default class with extends in ES5 env", () => {
	const d = new Derived();
	expect(d.kind()).toBe("derived");
	expect(Derived.name).toBe("default");
});
