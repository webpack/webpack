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

it("Symbol.iterator on class should work", (done) => {
    try {
        const objectA = new moduleA.default.MyClass(1);
        let counter = 0;
        for (const value of objectA) {
            expect(value).toEqual(counter);
            counter++;
        }
        done();
    } catch (error) {
        done(error);
    }
});

it("Symbol.asyncIterator on class should work", async (done) => {
    try {
        const objectB = new moduleB.default.MyClass(1);
        let counter = 0;
        for await (const value of objectB) {
            expect(value).toEqual(counter);
            counter++;
        }
        done();
    } catch (error) {
        done(error);
    }
})