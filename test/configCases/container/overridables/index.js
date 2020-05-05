__webpack_override__({
	test1: () =>
		new Promise(resolve => {
			setTimeout(() => {
				resolve(() => ({
					__esModule: true,
					default: "overriden1"
				}));
			}, 100);
		}),
	test3: () => () => "overriden3",
	package: () =>
		new Promise(resolve => {
			setTimeout(() => {
				resolve(() => "overriden-package");
			}, 100);
		}),
	"options/test1": () => () => "1",
	"nested1/options/test2": () => () => "2",
	"nested2/deep/deep": () => () => "3"
});

it("should be able to override a esm overridable", () => {
	return import("./modules/test1").then(m => {
		expect(m.default).toBe("overriden1");
	});
});

it("should be able to not override a esm overridable", () => {
	return import("./modules/test2").then(m => {
		expect(m.default).toBe("original2");
	});
});

import test3 from "./modules/test3";
it("should be able to use an overridable module in the initial chunk, but it's not overriden", () => {
	expect(test3).toBe("original3");
});

it("should be able to override a cjs overridable", () => {
	return import("./cjs/test1").then(m => {
		expect(m.default).toBe("overriden1");
	});
});

it("should be able to not override a cjs overridable", () => {
	return import("./cjs/test2").then(m => {
		expect(m.default).toBe("original2-cjs");
	});
});

it("should be able to use an overridable module in the initial chunk, and it's overriden", () => {
	expect(require("./cjs/test3")).toBe("overriden3");
});

it("should be able to override with a package name shortcut", () => {
	return import("package").then(m => {
		expect(m.default).toBe("overriden-package");
	});
});

it("should be able to override a relative request via shortcut", () => {
	return import("./options/test1").then(m => {
		expect(m.default).toBe("1");
	});
});

it("should be able to override a nested relative request via shortcut", () => {
	return import("./options/test2").then(m => {
		expect(m.default).toBe("2");
	});
});

it("should be able to override a deep nested request", () => {
	return import("./options/test3").then(m => {
		expect(m.default).toBe("3");
	});
});

it("should be able to override when fallback module has multiple chunks", () => {
	return import("./splitChunks").then(m => {
		expect(m.default).toBe(
			"index+app+vendor+shared+shared-separate+shared+shared-separate"
		);
	});
});
