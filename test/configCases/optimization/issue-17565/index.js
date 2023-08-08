var myModule = require("./module.esm");

it("should not throw when instantiating the class", (done) => {
    try {
        const object = new myModule.default.MyClass(1);
        done();
    } catch (error) {
        done(error);
    }
});
