it("Should use WebpackMissingModule when module is missing with multiple entry setup", function() {
  var fs = require("fs");
  var source = fs.readFileSync("test/js/config/errors/multi-entry-missing-module/b.js", "utf-8");
  source.should.containEql("!function(){var n=new Error('Cannot find module \"./intentionally-missing-module.js\"');throw n.code=\"MODULE_NOT_FOUND\",n}()}");

  (function() {
    require("./intentionally-missing-module");
  }).should.throw("Cannot find module \"./intentionally-missing-module\"");
});
