it("should require js module from base64 data-uri", function () {
	const mod = require("data:text/javascript;charset=utf-8;base64,ZXhwb3J0IGNvbnN0IG51bWJlciA9IDQyOwpleHBvcnQgZnVuY3Rpb24gZm4oKSB7CiAgcmV0dXJuICJIZWxsbyB3b3JsZCI7Cn0=");
	expect(mod.number).toBe(42);
	expect(mod.fn()).toBe("Hello world");
});

it("should require js module from ascii data-uri", function () {
	const mod = require('data:application/node;charset=utf-8,module.exports={number:42,fn:()=>"Hello world"}');
	expect(mod.number).toBe(42);
	expect(mod.fn()).toBe("Hello world");
});

it("should import js module from base64 data-uri", function () {
	const mod = require("./module-with-imports");
	expect(mod.number).toBe(42);
	expect(mod.fn()).toBe("Hello world");
});

it("should require coffee module from base64 data-uri", function () {
	const mod = require("coffee-loader!Data:application/node;charset=utf-8;base64,bW9kdWxlLmV4cG9ydHMgPQogIG51bWJlcjogNDIKICBmbjogKCkgLT4gIkhlbGxvIHdvcmxkIg==");
	expect(mod.number).toBe(42);
	expect(mod.fn()).toBe("Hello world");
});

it("should require json module from base64 data-uri", function () {
	const mod = require("DATA:application/json;charset=utf-8;base64,ewogICJpdCI6ICJ3b3JrcyIsCiAgIm51bWJlciI6IDQyCn0K");
	expect(mod.it).toBe("works");
	expect(mod.number).toBe(42);
});
