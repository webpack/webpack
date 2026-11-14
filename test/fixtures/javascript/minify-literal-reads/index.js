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

function note(value) {
	log.push(value);
	return value;
}

function joined() {
	return [void 0] + "a" + ([null, void 0] + "b");
}

function negated(x, y) {
	return (0 | !(x < 0)) ^ y;
}

function bigint(x) {
	return (0 | x) ^ 1n;
}

function picked() {
	return { a: { b: 1 }, b: function () {} }.a;
}

function unread() {
	~(function () {})(note("tilde"));
	-(function () {})(note("minus"), note("again"));
	~void note("void");
}

function mode() {
	return typeof FLAGS !== "undefined" ? FLAGS?.mode : "prod";
}

it("should fold literal reads and unread conversions as written", () => {
	expect(joined()).toBe("a,b");
	expect(negated(1, 0)).toBe(1);
	expect(negated(-1, 0)).toBe(0);
	expect(() => bigint(1n)).toThrow(TypeError);
	expect(picked()).toEqual({ b: 1 });
	unread();
	expect(log).toEqual(["tilde", "minus", "again", "void"]);
	expect(mode()).toBe("prod");
});
