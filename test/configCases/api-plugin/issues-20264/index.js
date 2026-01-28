module.exports = "index";

it("should get module id from __webpack_module__", () => {
  expect(__webpack_module__.id).toBeDefined();
  const module = "layout";
  expect(module).toBe("layout");
  expect(__webpack_module__.id).toBeDefined();
  expect(typeof __webpack_module__).toBe("object");
});