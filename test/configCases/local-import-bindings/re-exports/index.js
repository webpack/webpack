import { DIRECT, RENAMED, OWN, live } from "./barrel";

// A direct `eval` resolves names against the scope the module generated, which
// is what a debugger's console and watch expressions read.
const resolve = (name) => eval(name);

it("follows a re-export to the module that declares the binding", () => {
	expect(DIRECT).toBe("direct");
	expect(resolve("DIRECT")).toBe("direct");
	expect(RENAMED).toBe("direct");
	expect(resolve("RENAMED")).toBe("direct");
	expect(OWN).toBe("own");
	expect(resolve("OWN")).toBe("own");
});

it("leaves a re-exported live binding alone", () => {
	expect(() => resolve("live")).toThrow(ReferenceError);
	expect(live).toBe("live");
});
