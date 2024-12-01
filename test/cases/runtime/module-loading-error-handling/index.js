it("should throw an error with meaningful details for missing modules", () => {
    const moduleId = "nonexistent-module";
    expect(() => {
        __webpack_modules__[moduleId].call(null, {}, {}, require);
    }).toThrowError(/The module with id nonexistent-module could not be loaded/);
});
