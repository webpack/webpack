it("should not violate runtime boundaries when runtimeChunk is single", async () => {
    const [modA, modShared] = await Promise.all([
        import("./page-a"),
        import("./shared")
    ]);

    expect(modShared.sharedValue).toBe("shared-runtime-safe");
    expect(modA.pageA()).toBe("shared-runtime-safe-runtime-separated");
});
