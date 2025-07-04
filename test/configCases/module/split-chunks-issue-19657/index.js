import m2 from "./testModule2.js"

it("should compile and evaluate fine", (done) => {
    expect(m2()).toBe("m11111111");
    done()
});

export default "index";