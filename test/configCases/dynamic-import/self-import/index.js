it("should allow to import itself", async () => {
    // Dynamic import with self-import (e.g., import(import.meta.url)) does not create duplicate ChunkGroups
    // because the module is already in parent chunks, so it enters the skip logic at buildChunkGraph.js:734-738
    // (isOrdinalSetInMask check returns true).
	const module = await import(import.meta.url);
	expect(module).toBeDefined();
});

it("should allow to import itself with new URL", async (done) => {
	import(new URL(import.meta.url)).catch(e => {
        // import with new URL will create a ContextModule with critical flag
        // ContextModule will throw MODULE_NOT_FOUND
        expect(e.code).toBe("MODULE_NOT_FOUND");
        done();
    });
});