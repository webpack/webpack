import { utilA } from "./lib"

it("should not emit error when running a.js (runtime a)", () => {
  expect(utilA()).toBe("a");
})
