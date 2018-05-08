"use strict";

import a from "./a";

it("should parse classes", function() {
	class MyClass {
		constructor() {
			this.a = require("./a");
		}

		func() {
			return require("./b");
		}

		[require("./c")]() {
			return "c";
		}
	}

	var x = new MyClass();

	expect(x.a).toBe("a");
	expect(x.func()).toBe("b");
	expect(x.c()).toBe("c");
});

it("should parse spread operator"/*, function() {
	expect([0, ...require("./array")]).toEqual([0, 1, 2, 3]);
	expect(({z: 0, ...require("./object")})).toEqual({z: 0, a: 1, b: 2, c: 3});
}*/);

it("should parse arrow function", function() {
	expect((() => require("./a"))()).toBe("a");
	expect((() => {
		return require("./a");
	})()).toBe("a");
	require.ensure([], () => {
		require("./a");
	});
	require.ensure([], () => {
		require("./async");
	});
	if(module.hot) {
		module.hot.accept("./a", () => {
			var x = 1;
		});
	}
});

it("should parse template literals", function() {
	function tag(strings, value) {
		return value;
	}
	var x = `a${require("./b")}c`;
	var y = tag`a${require("./b")}c`;
	expect(x).toBe("abc");
	expect(y).toBe("b");
})

it("should parse generators and yield", function() {
	function* gen() {
		yield require("./a");
		yield require("./b");
	}
	var x = gen();
	expect(x.next().value).toBe("a");
	expect(x.next().value).toBe("b");
	expect(x.next().done).toBe(true);
})
