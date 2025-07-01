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

// ESM external modules with circular dependencies
it("should maintain live bindings for ESM external modules", async () => {
	// Import external modules that have circular dependencies
	const moduleA = await import("external-module-a");
	const moduleB = await import("external-module-b");

	// Verify that circular dependencies are resolved correctly
	expect(moduleA.externalValue).toBe("external-A");
	expect(moduleB.externalValue).toBe("external-B");

	// Verify that re-exports work correctly in circular scenarios
	expect(moduleA.getOtherValue).toBeDefined();
	expect(moduleB.getOtherValue).toBeDefined();

	// Test that the modules maintain their identity (live bindings)
	expect(await import("external-module-a")).toBe(moduleA);
	expect(await import("external-module-b")).toBe(moduleB);
});

// Edge case: Multiple imports of the same external module
it("should handle multiple imports of circular external modules", () => {
	// This tests that the runtime module correctly caches external modules
	const firstImportA = directExternalA;
	const secondImportA = getFromExternalA();

	// Both should reference the same value
	expect(firstImportA).toBe(secondImportA);
	expect(firstImportA).toBe("external-A");
});
