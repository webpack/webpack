import { valueA, getFromExternalA, callB } from "./module-a.js";
import { valueB, getFromExternalB, callA } from "./module-b.js";
import { externalValue as directExternalA } from "external-module-a";
import { externalValue as directExternalB } from "external-module-b";

it("should handle circular dependencies between internal modules", () => {
	expect(valueA).toBe("module-A");
	expect(valueB).toBe("module-B");
	expect(callB()).toBe("module-B");
	expect(callA()).toBe("module-A");
});

it("should handle imports from external modules", () => {
	expect(getFromExternalA()).toBe("external-A");
	expect(getFromExternalB()).toBe("external-B");
});

it("should handle direct imports from external modules", () => {
	expect(directExternalA).toBe("external-A");
	expect(directExternalB).toBe("external-B");
});
