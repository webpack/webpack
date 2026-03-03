it("should concatenate parent-chunk module into child async chunk", async () => {
    // shared is loaded first as a separate chunk, then page-a as a child chunk
    const { sharedValue } = await import("./shared");
    const { pageA } = await import("./page-a");

    expect(sharedValue).toBe("shared-value");
    expect(pageA()).toBe("shared-value-from-shared");
});
