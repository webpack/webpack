it("should define and require a local module", function () {
	module.exports = "not set";
	define("my-module", function () {
		return 1234;
	});
	expect(module.exports).toBe("not set");
	define(["my-module"], function (myModule) {
		expect(myModule).toBe(1234);
		return 2345;
	});
	expect(module.exports).toBe(2345);
	expect(require("my-module")).toBe(1234);
	require(["my-module"]);
});

it("should not create a chunk for a AMD require to a local module", function (done) {
	define("my-module2", function () {
		return 1235;
	});
	var sync = false;
	require(["my-module2"], function (myModule2) {
		expect(myModule2).toBe(1235);
		sync = true;
	});
	setImmediate(function () {
		expect(sync).toBe(true);
		done();
	});
});

it("should define and require a local module with deps", function () {
	module.exports = "not set";
	define("my-module3", ["./dep"], function (dep) {
		expect(dep).toBe("dep");
		return 1234;
	});
	expect(module.exports).toBe("not set");
	define("my-module4", ["my-module3", "./dep"], function (myModule, dep) {
		expect(dep).toBe("dep");
		expect(myModule).toBe(1234);
		return 2345;
	});
	expect(module.exports).toBe("not set");
	expect(require("my-module3")).toBe(1234);
	expect(require("my-module4")).toBe(2345);
});

it("should define and require a local module that is relative", function () {
	define("my-dir/my-module3", function () {
		return 1234;
	});
	define("my-dir/my-other-dir/my-module4", function () {
		return 2345;
	});
	define("my-dir/my-other-dir/my-module5", [
		"./my-module4",
		"../my-module3"
	], function (myModule4, myModule3) {
		expect(myModule3).toBe(1234);
		expect(myModule4).toBe(2345);
		return 3456;
	});
	expect(require("my-dir/my-other-dir/my-module5")).toBe(3456);
});

it("issue 12310", () => {
	const obj = { ok: true };
	define("local-module1", obj);
	const fn2 = () => ({ ok: true });
	define("local-module2", fn2);
	const fn3 = m1 => {
		return { m1 };
	};
	define("local-module3", ["local-module1"], fn3);
	expect(require("local-module1")).toBe(obj);
	expect(require("local-module2")).toEqual(obj);
	expect(require("local-module3")).toEqual({ m1: obj });
});
