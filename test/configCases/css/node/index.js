import { i } from "./i.modules.css"

it("should work", () => {
    expect(typeof i).toBe("string")
    expect(__webpack_modules__["./i.modules.css"]).toBeDefined();
    expect(__webpack_modules__["./e.modules.css"]).toBeUndefined();
})