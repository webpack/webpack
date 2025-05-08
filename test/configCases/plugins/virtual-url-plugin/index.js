import { routes } from "virtual:routes"

it("should correctly load virtual routes", (done) => {
    expect(typeof routes.bar).toBe("function");
    expect(typeof routes.foo).toBe("function");

    Promise.all([
        routes.bar(),
        routes.foo()
    ]).then(([{bar}, {foo}]) => {
        expect(bar).toBe("bar");
        expect(foo).toBe("foo");
        done();
    });
});
