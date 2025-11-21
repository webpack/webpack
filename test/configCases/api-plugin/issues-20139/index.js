import * as foo from "./foo";
import { bar } from "./bar";

it("should load module with nested __webpack_require__", () => {
  expect(foo).toBeDefined();
  expect(bar).toBe("bar");
});

it("should provide __webpack_global__ when module uses __webpack_require__", () => {
  expect(__webpack_require__.myCustomProperty).toBe("myCustomProperty");
  expect(__webpack_global__.anotherProperty).toBe("anotherProperty");
  expect(__webpack_global__.bar).toBe("bar");
});