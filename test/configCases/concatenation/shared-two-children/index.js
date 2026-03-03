it("should concatenate shared parent-chunk module into two independent child chunks", async () => {
    const [modA, modB, modShared] = await Promise.all([
        import("./page-a"),
        import("./page-b"),
        import("./shared")
    ]);

    expect(modShared.sharedValue).toBe("shared-value");
    expect(modA.pageA()).toBe("page-a:shared-value:from-shared");
    expect(modB.pageB()).toBe("page-b:shared-value:from-shared");
});
