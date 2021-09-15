import d from "../0-create-dll/d";
import { x1, y2 } from "./e";
import { x2, y1 } from "../0-create-dll/e";

it("should load a module from dll", function() {
	expect(require("../0-create-dll/a")).toBe("a");
});

it("should load an async module from dll", function(done) {
	require("../0-create-dll/b")().then(function(c) {
		expect(c).toEqual(nsObj({ default: "c" }));
		done();
	}).catch(done);
});

it("should load an harmony module from dll (default export)", function() {
	expect(d).toBe("d");
});

it("should load an harmony module from dll (star export)", function() {
	expect(x1).toBe(123);
	expect(x2).toBe(123);
	expect(y1).toBe(456);
	expect(y2).toBe(456);
});

it("should load a module with loader applied", function() {
	expect(require("../0-create-dll/g.abc.js")).toBe("number");
});
