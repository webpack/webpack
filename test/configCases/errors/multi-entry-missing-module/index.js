it("Should use WebpackMissingModule when module is missing with multiple entry setup", function() {
  var fs = require("fs");
  var path = require("path");
  var source = fs.readFileSync(path.join(__dirname, "b.js"), "utf-8");
  source.should.containEql("!function(){var n=new Error('Cannot find module \"./intentionally-missing-module.js\"');throw n.code=\"MODULE_NOT_FOUND\",n}()}");

  (function() {
    require("./intentionally-missing-module");
  }).should.throw("Cannot find module \"./intentionally-missing-module\"");
});
