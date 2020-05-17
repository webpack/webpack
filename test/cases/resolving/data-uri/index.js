it("should require js module from base64 data-uri", function() {
	const mod = require("data:text/javascript;charset=utf-8;base64,bW9kdWxlLmV4cG9ydHMgPSB7CiAgbnVtYmVyOiA0MiwKICBmbjogKCkgPT4gIkhlbGxvIHdvcmxkIgp9Ow==");
	expect(mod.number).toBe(42);
	expect(mod.fn()).toBe("Hello world");
});

it("should require js module from ascii data-uri", function() {
	const mod = require("data:text/javascript;charset=utf-8;ascii,module.exports={number:42,fn:()=>\"Hello world\"}");
	expect(mod.number).toBe(42);
	expect(mod.fn()).toBe("Hello world");
});

it("should import js module from base64 data-uri", function() {
	const mod = require('./module-with-imports');
	expect(mod.number).toBe(42);
	expect(mod.fn()).toBe("Hello world");
});
