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
var flag;

function track(value) {
	log.push(value);
	return value;
}

function booleans(c) {
	if (c) {
		flag = true;
	} else {
		flag = false;
	}
	return flag;
}

var named = function named() {
	var named = 1;
	return named;
};

var keptName = function keptName(read = keptName) {
	var keptName;
	return typeof read;
};

function branches(a) {
	if (a) typeof missing;
	if (track("test")) 1;
	else 2;
	return a;
}

function bare(c) {
	var a, b;
	if (c) return (a = 2) + (b = 3);
}

it("should print an `if` assigning opposite booleans as the test negated", () => {
	expect(booleans(2)).toBe(true);
	expect(booleans(0)).toBe(false);
});

it("should drop a function expression's name its body declares again", () => {
	expect(named()).toBe(1);
	expect(keptName()).toBe("function");
});

it("should drop an `if` branch running nothing, and print an unread number bare", () => {
	log.length = 0;
	expect(branches(1)).toBe(1);
	expect(log).toEqual(["test"]);
	expect(bare(1)).toBe(5);
});
