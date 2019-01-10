it("should not move externals into the commons chunk", function() {
    var fs = require("fs");
    var source1 = fs.readFileSync(__dirname + "/main.js", "utf-8");
    var source2 = fs.readFileSync(__dirname + "/other.js", "utf-8");
    var source3 = fs.readFileSync(__dirname + "/common.js", "utf-8");
    expect(source1).toMatch("1+" + (1+1));
    expect(source1).toMatch("3+" + (2+2));
    expect(source2).toMatch("1+" + (1+1));
    expect(source2).toMatch("5+" + (3+3));
    expect(source3).not.toMatch("1+" + (1+1));
    expect(source3).not.toMatch("3+" + (2+2));
    expect(source3).not.toMatch("5+" + (3+3));

    require("external");
    require("external2");
    require("./module");
});
