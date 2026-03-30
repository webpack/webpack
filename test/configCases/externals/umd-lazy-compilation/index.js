var fs = require("fs");
var path = require("path");

it("UMD wrapper should declare externals used by lazy-compiled modules", function () {
    // The bundle source must contain require("my-external") in the UMD factory
    // wrapper even when the module using it is lazy-compiled.
    var source = fs.readFileSync(path.join(__dirname, "bundle0.js"), "utf-8");
    expect(source).toMatch('require("my-external")');
});

it("should resolve the lazy-compiled module that uses the external", function (done) {
    import("./lazy-module").then(function (m) {
        expect(m.default).toBe("my-external-value");
        done();
    }).catch(done);
});