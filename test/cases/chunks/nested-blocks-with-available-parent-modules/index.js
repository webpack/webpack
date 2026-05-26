// `./a` is pulled into the entry chunk by the synchronous require, so the
// outer `require.ensure(["./a"], ...)` would otherwise be a candidate for the
// "all dependencies already available" skip in buildChunkGraph's
// `connectChunkGroups`. The `blocksWithNestedBlocks` guard prevents that skip
// here — without it, the outer block's chunk group never gets a parent and
// gets cleaned up together with the nested chunk group that contains `./b`,
// so the inner require would fail at runtime.
require("./a");

it("should keep nested async chunks reachable when the outer block's modules are already in the entry chunk", (done) => {
	require.ensure(["./a"], () => {
		require.ensure([], () => {
			const b = require("./b");
			expect(b).toBe(42);
			done();
		});
	});
});
