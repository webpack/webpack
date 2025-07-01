import { m1 } from "./testModule1.js"
import { m2 } from "./testModule2.js"

it("should compile and evaluate fine", (done) => {
    expect(m1).toBeDefined();
    expect(m2).toBeDefined();
    done()
});
