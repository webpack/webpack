it("should not duplicate side-effectful modules during concatenation", async () => {
    // Reset counter before test
    global.__sideEffectCounter = 0;

    const [modConsumer, modSideEffect] = await Promise.all([
        import("./consumer"),
        import("./side-effect")
    ]);

    // side-effect.js should only have been executed once, not duplicated
    expect(global.__sideEffectCounter).toBe(1);
    expect(modSideEffect.sideEffectValue).toBe("executed");
    expect(modConsumer.consume()).toBe("consumed:executed");
});
