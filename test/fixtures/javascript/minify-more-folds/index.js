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

var log = [];

function spreads(index) {
	return [
		[10, ...[], 20, ...[30, 40], 50]["length"],
		[10, ...[], 20, ...[30, 40], 50][3],
		[...[10, 20]][5],
		[...[10, 20]][index]
	];
}

function added(x) {
	var y;
	return ["" + (x += "foo"), (y = "a") + "", x, y];
}

function C() {
	this.v = 1;
}

function make() {
	log.push("make");
	return C;
}

function* constructs() {
	var t = yield make();
	return new t();
}

function constructed() {
	var t = make();
	return new t(1).v;
}

function tail() {
	return (function () {
		log.push("tail");
	})();
}

it("should read an array spreading array literals", () => {
	expect(spreads(1)).toEqual([5, 40, undefined, 20]);
});

it("should print an empty string added to a string assignment as the assignment", () => {
	expect(added(1)).toEqual(["1foo", "a", "1foo", "a"]);
});

it("should fold a value into what `new` constructs, and print a tail call returning nothing", () => {
	log.length = 0;
	var it = constructs();
	it.next();
	expect(it.next(C).value.v).toBe(1);
	expect(constructed()).toBe(1);
	expect(tail()).toBe(undefined);
	expect(log).toEqual(["make", "make", "tail"]);
});
