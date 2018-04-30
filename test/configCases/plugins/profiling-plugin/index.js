import "./test.json";

it("should generate a events.json file", () => {
    var fs = require("fs"),
        path = require("path"),
        os = require("os");
    fs.existsSync(path.join(os.tmpdir(), "events.json")).should.be.true();
});

it("should have proper setup record inside of the json stream", () => {
    var fs = require("fs"),
        path = require("path"),
        os = require("os");

    // convert json stream to valid
    var source = JSON.parse(fs.readFileSync(path.join(os.tmpdir(), "events.json"), "utf-8").toString() + "{}]");
    source[0].id.should.eql(1);
});
