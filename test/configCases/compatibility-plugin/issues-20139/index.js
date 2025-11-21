import * as foo from "./foo";

it("should add myCustomProperty to __webpack_require__", () => {
  expect(foo).toBeDefined();
});

it("should respect webpackNoRename magic comment", () => {
  expect(__webpack_require__.myCustomProperty).toBe("myCustomProperty");
  expect(__webpack_require__.anotherProperty).toBe("anotherProperty");
});