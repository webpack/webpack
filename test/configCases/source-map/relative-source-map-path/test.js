var fs = require("fs");
var source = fs.readFileSync(__filename, "utf-8");
var match = /sourceMappingURL\s*=\s*(.*)/.exec(source);
match[1].should.be.eql("c.js.map");