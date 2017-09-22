module.exports = {
  runner: "jest-runner-mocha",
  testMatch: ["<rootDir>/test/*.test.js"],
  coveragePathIgnorePatterns: ["**/*.runtime.js"],
  watchPathIgnorePatterns: [".*\\c.runtime.js", "\\/test\\/js\\/.*"],
};
