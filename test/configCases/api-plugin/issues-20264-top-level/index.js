import moduleFn from "./fn";
import moduleClass from "./class";

const module = "layout";
if (module === __webpack_module__) {
  throw new Error("module is __webpack_module__, this should not happen");
}

it("should get module id from __webpack_module__", () => {
  expect(__webpack_module__.id).toBeDefined();
  const module = "layout";
  expect(module).toBe("layout");
  expect(__webpack_module__.id).toBeDefined();
  expect(moduleFn()).toBeDefined();
  expect(moduleClass.id).toBeDefined();
  expect(typeof __webpack_module__).toBe("object");
});