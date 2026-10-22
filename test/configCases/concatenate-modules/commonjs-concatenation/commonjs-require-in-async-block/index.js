import {
	loadAmd,
	loadCommonJs,
	loadConstructed,
	loadMember,
	loadNamespace,
	loadNested
} from "./route";

it("commonjs-require-in-async-block: should substitute a whole-namespace require(esm) inside require.ensure", async () => {
	await expect(loadNamespace()).resolves.toEqual(["esm", { isDefault: true }]);
});

it("commonjs-require-in-async-block: should substitute a member access on require(esm) inside require.ensure", async () => {
	await expect(loadMember()).resolves.toBe("esm");
});

it("commonjs-require-in-async-block: should substitute a `new require()` inside require.ensure", async () => {
	await expect(loadConstructed()).resolves.toBe("constructed");
});

it("commonjs-require-in-async-block: should substitute a require() of a CommonJS module inside require.ensure", async () => {
	await expect(loadCommonJs()).resolves.toBe("cjs");
});

it("commonjs-require-in-async-block: should substitute a require() inside a nested require.ensure", async () => {
	await expect(loadNested()).resolves.toBe("nested");
});

it("commonjs-require-in-async-block: should substitute a require() inside an AMD require block", async () => {
	await expect(loadAmd()).resolves.toEqual(["amd-dep", "amd-target"]);
});
