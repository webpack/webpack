import {
	loadAlsoImported,
	loadCalled,
	loadConditional,
	loadDestructured,
	loadResolved
} from "./route";

it("should read a destructured require() inside require.ensure", async () => {
	await expect(loadDestructured()).resolves.toEqual(["first", "second"]);
});

it("should call the result of a require() inside require.ensure", async () => {
	await expect(loadCalled()).resolves.toBe("called");
});

it("should keep both branches of a conditional require() inside require.ensure", async () => {
	await expect(loadConditional(true)).resolves.toBe("branch-a");
	await expect(loadConditional(false)).resolves.toBe("branch-b");
});

it("should keep require.resolve() inside require.ensure working", async () => {
	const [id, value] = await loadResolved();
	expect(id).toBeDefined();
	expect(value).toBe("resolved");
});

it("should share one instance with a module-level import of the same module", async () => {
	await expect(loadAlsoImported()).resolves.toEqual(["shared", "shared"]);
});
