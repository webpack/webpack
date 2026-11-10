import {
	loadAlsoImported,
	loadCalled,
	loadConditional,
	loadDestructured,
	loadResolved
} from "./route";

it("commonjs-require-forms-in-async-block: should read a destructured require() inside require.ensure", async () => {
	await expect(loadDestructured()).resolves.toEqual(["first", "second"]);
});

it("commonjs-require-forms-in-async-block: should call the result of a require() inside require.ensure", async () => {
	await expect(loadCalled()).resolves.toBe("called");
});

it("commonjs-require-forms-in-async-block: should keep both branches of a conditional require() inside require.ensure", async () => {
	await expect(loadConditional(true)).resolves.toBe("branch-a");
	await expect(loadConditional(false)).resolves.toBe("branch-b");
});

it("commonjs-require-forms-in-async-block: should keep require.resolve() inside require.ensure working", async () => {
	const [id, value] = await loadResolved();
	expect(id).toBeDefined();
	expect(value).toBe("resolved");
});

it("commonjs-require-forms-in-async-block: should share one instance with a module-level import of the same module", async () => {
	await expect(loadAlsoImported()).resolves.toEqual(["shared", "shared"]);
});
