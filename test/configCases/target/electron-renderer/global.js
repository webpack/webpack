it("should compile fine with global", () => {
    // `global` should compile to RuntimeGlobals.global
    expect((() => global).toString()).toContain("__webpack_require__");
})
