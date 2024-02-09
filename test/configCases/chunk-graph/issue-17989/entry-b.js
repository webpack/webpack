it("should have util2.js in util chunk", () => {
  return import("./shared")
    .then(({ default: loadModule }) => loadModule())
    .then((module) => {
      let arg = module.arg;
      expect(arg).toBe(42)
      expect(typeof __webpack_modules__["./util2.js"]).toBe("function")
      expect(typeof require.cache["./util2.js"]).toBe("object"); // loaded on __webpack_require__.c["./util2.js"]
      return arg
    })
    .then(arg => {
      return import("./util1").then(module => {
        let res = module.f(arg);
        expect(res).toBe(84);
      })
    })
});
