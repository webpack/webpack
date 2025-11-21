import * as foo from "./foo";

it("should load module with nested __webpack_require__", () => {
  expect(foo).toBeDefined();
});

it("should provide __webpack_global__ when module uses __webpack_require__", () => {
  expect(__webpack_require__.myCustomProperty).toBe("myCustomProperty");
  expect(__webpack_global__.anotherProperty).toBe("anotherProperty");
});