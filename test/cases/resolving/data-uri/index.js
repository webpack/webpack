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

it("should require js module from utf-8 percent-encoded data-uri", function () {
	const mod = require(
		'data:application/node;charset=utf-8,module.exports={text:"caf%C3%A9 %E2%98%95",emoji:"%F0%9F%98%80"}'
	);
	expect(mod.text).toBe("café ☕");
	expect(mod.emoji).toBe("😀");
});

it("should keep the raw body of a non-percent-encoded data-uri", function () {
	// A bare `%` is invalid percent-encoding, so decoding falls back to the raw body.
	const mod = require('data:application/node,module.exports={pct:"100%"}');
	expect(mod.pct).toBe("100%");
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
