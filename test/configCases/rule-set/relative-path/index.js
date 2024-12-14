it("should match modules by package", function() {
  var package = require("fake-package");
  expect(package).toEqual("matched-by-package");
});

it("should match modules by relative path within package", function() {
    var button = require("fake-package/lib/button.js");
    expect(button).toEqual("matched-by-relative-path");
});

it("should match modules by exclude", function() {
    var excluded = require("fake-package/lib/excluded.js");
    expect(excluded).toEqual("excluded");
});

it("should match modules by use", function() {
    var test = require("fake-package/lib/test.js");
    expect(test).toEqual("matched-by-test");
});
