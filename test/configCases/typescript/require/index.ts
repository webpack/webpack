"use strict";

const mod1 = require("./module.ts");
const mod2 = require("./module-2.js");
const mod3 = require("./module-3");
const mod4 = require("@components/my-component.ts");
const mod5 = require("./module-4.js");

const myString: string = "foo";

it("should work", () => {
	expect(myString).toBe("foo");
	expect(mod1).toBe("ok");
	expect(mod2).toBe("ok");
	expect(mod3).toBe("ok");
	expect(mod4).toBe("ok");
	expect(mod5).toBe("ok");
});
