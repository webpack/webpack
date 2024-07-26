import { utilB } from "./lib"

it("should not emit error when running b.js (runtime b)", () => {
  expect(utilB()).toBe("[object Object] common");
})
