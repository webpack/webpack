var moduleA = require("./moduleA");
var moduleB = require("./moduleB");

it("should not throw when instantiating the class", (done) => {
    try {
        const objectA = new moduleA.default.MyClass(1);
        const objectB = new moduleB.default.MyClass(1);
        done();
    } catch (error) {
        done(error);
    }
});
