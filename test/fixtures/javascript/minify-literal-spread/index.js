// The config case's `it` and `expect`, logging what each assertion reads,
// so a print that changes a value or a throw runs otherwise.
var show = function (value) {
	if (typeof value === "function") return "[function]";
	try {
		return String(JSON.stringify(value, function (key, one) {
			return typeof one === "bigint" ? one + "n" : typeof one === "function" ? "[function]" : one;
		}));
	} catch (error) {
		return String(value);
	}
};
var it = function (title, body) {
	console.log("it", title);
	try {
		body(function () {});
	} catch (error) {
		console.log("throws", error && error.name);
	}
};
var expect = function (value) {
	var matchers = new Proxy({}, {
		get: function (target, name) {
			if (name === "not" || name === "resolves" || name === "rejects") return matchers;
			return function () {
				if (/Snapshot$/.test(name)) return;
				if (/^toThrow/.test(name) && typeof value === "function") {
					try {
						console.log(name, "returns", show(value()));
					} catch (error) {
						console.log(name, "throws", error && error.name);
					}
					return;
				}
				console.log(name, show(value));
			};
		}
	});
	return matchers;
};

function collect() {
	return Array.prototype.slice.call(arguments);
}

function Collect() {
	this.items = Array.prototype.slice.call(arguments);
}

it("should print what a spread literal holds in its place", () => {
	expect([1, ...[2, 3], ...[]]).toEqual([1, 2, 3]);
	expect({ a: 1, ...{ b: 2, ["c"]: 3 } }).toEqual({ a: 1, b: 2, c: 3 });
	expect({ a: 1, ...{ a: 2 } }).toEqual({ a: 2 });
	expect(collect(...[4, 5])).toEqual([4, 5]);
	expect(new Collect(...[6]).items).toEqual([6]);
});

it("should keep a hole a spread printing nothing follows", () => {
	expect([1, , ...[]].length).toBe(2);
	expect([, ...[]].length).toBe(1);
});

it("should run what a spread holds where only the arguments of a call run", () => {
	const calls = [];
	(function () {})(...[calls.push("a"), calls.push("b")]);
	expect(calls).toEqual(["a", "b"]);
});

it("should drop a spread primitive, which copies nothing", () => {
	expect({ a: 1, ...null, ...void 0, ...true, ...7 }).toEqual({ a: 1 });
});

it("should keep a spread whose items would read otherwise inlined", () => {
	const holes = [1, ...[2, , 3]];
	expect(1 in holes).toBe(true);
	expect(2 in holes).toBe(true);
	let reads = 0;
	const read = {
		...{
			get value() {
				reads++;
				return reads;
			}
		}
	};
	expect(Object.getOwnPropertyDescriptor(read, "value").value).toBe(1);
	expect(Object.getPrototypeOf({ ...{ __proto__: null } })).toBe(
		Object.prototype
	);
	expect({ ..."ab" }).toEqual({ 0: "a", 1: "b" });
});
