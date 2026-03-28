import value from "./lib";

if (typeof define === "undefined") {
    globalThis.define = function (deps, factory) {
        factory();
    };
}

var result;

define(["require"], function (require) {
    result = value;
});

it("should resolve harmony import binding in define callback", function () {
    expect(result).toBe(42);
});
