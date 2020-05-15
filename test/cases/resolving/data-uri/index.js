it("should require module from data-uri", function() {
	const mod = require("data:text/javascript;charset=utf-8;base64,bW9kdWxlLmV4cG9ydHMgPSB7CiAgbnVtYmVyOiA0MiwKICBmbjogKCkgPT4gIkhlbGxvIHdvcmxkIgp9Ow==");
	expect(mod.number).toBe(42);
	expect(mod.fn()).toBe("Hello world");
});

it("should import module from data-uri", function() {
	const mod = require('./module-with-imports');
	expect(mod.number).toBe(42);
	expect(mod.fn()).toBe("Hello world");
});
