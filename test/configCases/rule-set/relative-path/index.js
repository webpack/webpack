it("should match modules by package", function() {
  var package = require("fake-package");
  expect(package).toEqual("matched-by-package");
});


it("should match modules by relative path within package", function() {
    var button = require("fake-package/lib/button.js");
    expect(button).toEqual("matched-by-relative-path");
});


