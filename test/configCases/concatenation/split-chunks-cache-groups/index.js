it("should allow concatenation across splitChunks cacheGroups boundaries", async () => {
    // util is placed in a shared cacheGroup chunk (parent).
    // feature-a is an async child chunk that imports util.
    // After the fix, util should concatenate into feature-a without bailout.
    const [modA, modUtil] = await Promise.all([
        import("./feature-a"),
        import("./util")
    ]);

    expect(modUtil.utilValue).toBe("util-from-cache-group");
    expect(modA.featureA()).toBe("util-from-cache-group:feature-a");
});
