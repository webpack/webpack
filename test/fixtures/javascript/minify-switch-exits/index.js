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

function labeled(log, x) {
	switch (x) {
		case 1:
			log.push("one");
			found: break;
			log.push("dead");
		default:
			log.push("other");
	}
	return log;
}

function soleTest(log) {
	switch (log.push("tested")) {
		case log.push("first"):
		case 2:
	}
	return log;
}

function laterTest(log) {
	switch (log.push("tested") + 5) {
		case 1:
		case log.push("second"):
	}
	return log;
}

function blockCase(x) {
	switch (x) {
		case 1: {
			let data = x + 1;
			return data;
		}
	}
	return 0;
}

function blockScoped(x, make) {
	switch (x) {
		case 1: {
			let data = make(x);
			return data + data;
		}
	}
	return 0;
}

function blockBreak(log, x) {
	switch (x) {
		case 1: {
			let data = log.length;
			log.push("block", data);
			break;
		}
		default:
			break;
	}
	log.push("after");
	return log;
}

function loopLabel(log) {
	for (;;) {
		log.push("once");
		out: break;
		log.push("dead");
	}
	return log;
}

it("should run what a switch or loop runs before a labeled break", () => {
	expect(labeled([], 1)).toEqual(["one"]);
	expect(labeled([], 2)).toEqual(["other"]);
	expect(soleTest([])).toEqual(["tested", "first"]);
	expect(laterTest([])).toEqual(["tested", "second"]);
	expect(blockCase(1)).toBe(2);
	expect(blockCase(3)).toBe(0);
	expect(blockScoped(1, (v) => v * 3)).toBe(6);
	expect(blockScoped(2, (v) => v * 3)).toBe(0);
	expect(loopLabel([])).toEqual(["once"]);
	expect(blockBreak([], 1)).toEqual(["block", 0, "after"]);
	expect(blockBreak([], 2)).toEqual(["after"]);
});
