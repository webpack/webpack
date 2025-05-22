import { routes } from "virtual:routes"
import { app } from "virtual:app"
import json from "virtual:config"
import { ts } from "virtual:ts"
import txt from "virtual:txt"

it("should correctly load virtual modules with the js type.", (done) => {
    expect(typeof routes.bar).toBe("function");
    expect(typeof routes.foo).toBe("function");
    expect(app).toBe("app");
    Promise.all([
        routes.bar(),
        routes.foo()
    ]).then(([{bar}, {foo}]) => {
        expect(bar).toBe("bar");
        expect(foo).toBe("foo");
        done();
    }).catch(done);
});

it("should correctly load virtual modules with the json type.", (done) => {
    expect(json.name).toBe("virtual-url-plugin");
    done()
});

it("should correctly load virtual modules with the css type.", (done) => {
    import("virtual:style").then(() => done()).catch(done)
});

it("should correctly load virtual modules with the asset/source type.", (done) => {
    expect(txt).toBe("Hello world");
    done();
});

it("should correctly load virtual modules with custom loader.", (done) => {
    expect(ts).toBe("var");
    done()
});