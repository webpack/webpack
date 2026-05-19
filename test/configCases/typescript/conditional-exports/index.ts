import { greeting } from "my-lib";

it("should resolve the typescript condition to the .ts source", () => {
	// With `experiments.typescript: true`, webpack adds "typescript" to
	// resolve.conditionNames, so the package's `exports["."]["typescript"]`
	// branch wins over the `import` branch — matching Node.js's amaro
	// behavior for monorepos that ship .ts sources.
	expect(greeting).toBe("from-ts-source");
});
