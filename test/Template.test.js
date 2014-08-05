ould = require("should");
var path = require("path");

var template = require("../lib/Template");

describe("Template", function() {
  it("should generate valid identifiers", function() {
    template.toIdentifier("0abc-def9").should.equal("_abc_def9");
  });
});
