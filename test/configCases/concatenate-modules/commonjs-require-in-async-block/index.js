import {
	loadAmd,
	loadCommonJs,
	loadConstructed,
	loadMember,
	loadNamespace,
	loadNested
} from "./route";

it("should substitute a whole-namespace require(esm) inside require.ensure", async () => {
	await expect(loadNamespace()).resolves.toEqual(["esm", { isDefault: true }]);
});

it("should substitute a member access on require(esm) inside require.ensure", async () => {
	await expect(loadMember()).resolves.toBe("esm");
});

it("should substitute a `new require()` inside require.ensure", async () => {
	await expect(loadConstructed()).resolves.toBe("constructed");
});

it("should substitute a require() of a CommonJS module inside require.ensure", async () => {
	await expect(loadCommonJs()).resolves.toBe("cjs");
});

it("should substitute a require() inside a nested require.ensure", async () => {
	await expect(loadNested()).resolves.toBe("nested");
});

it("should substitute a require() inside an AMD require block", async () => {
	await expect(loadAmd()).resolves.toEqual(["amd-dep", "amd-target"]);
});
