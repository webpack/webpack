const IGNORES = ["<rootDir>/node_modules(/|$)", "<rootDir>/test/js(/|$)", "<rootDir>/benchmark(/|$)"];

module.exports = {
  runner: "jest-runner-mocha",
  testMatch: ["<rootDir>/test/*.test.js", "<rootDir>\\test\\*.unittest.js"],
  coveragePathIgnorePatterns: IGNORES.concat(["**/*.runtime.js"]),
  modulePathIgnorePatterns: IGNORES,
  watchPathIgnorePatterns: IGNORES,
  transform: {},
};
