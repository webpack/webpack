"use strict";

it("should use NormalModuleReplacementPlugin for string replacement", function () {
    const result = require("./before-string.js");
    expect(result).toBe("replaced-by-string");
});

it("should use NormalModuleReplacementPlugin for function replacement", function () {
    const result = require("./before-function.js");
    expect(result).toBe("replaced-by-function");
});

it("should use NormalModuleReplacementPlugin for function replacement (afterResolve)", function () {
    const result = require("./after-function.js");
    expect(result).toBe("replaced-after-resolve");
});

it("should use NormalModuleReplacementPlugin for relative path replacement (afterResolve)", function () {
    const result = require("./after-relative.js");
    expect(result).toBe("replaced-after-resolve");
});
