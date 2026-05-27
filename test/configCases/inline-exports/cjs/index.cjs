const constants = require("../basic/constants");

const generated = /** @type {string} */ (__non_webpack_require__("fs").readFileSync(__filename, "utf-8"));

it("should not inline constants for cjs", () => {
  // START:A
  expect(constants.REMOVE_n).toBe(null);
  // END:A
  const block = generated.match(/\/\/ START:A([\s\S]*)\/\/ END:A/)[1];
  expect(block.includes(`(constants.REMOVE_n).toBe(null)`)).toBe(true);
})

it("should keep the module for cjs", () => {
  const noInlinedModuleIds = ["../basic/constants.js"];
  noInlinedModuleIds.forEach(m => {
    expect(generated.includes(`"${m}"\n(`)).toBe(true);
  })
})
