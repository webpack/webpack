it("Should use WebpackMissingModule when module is missing with multiple entry setup", function() {
  var fs = require("fs");
  var path = require("path");
  var source = fs.readFileSync(path.join(__dirname, "b.js"), "utf-8");
  expect(source).toMatch("!(function webpackMissingModule() { var e = new Error(\"Cannot find module './intentionally-missing-module.js'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }());");

  expect(function() {
    require("./intentionally-missing-module");
  }).toThrowError("Cannot find module './intentionally-missing-module'");
});
