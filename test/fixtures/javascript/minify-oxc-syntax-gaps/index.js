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

const log = [];

function record(value) {
	log.push(value);
	return value;
}

function bigIntPatterns() {
	return [String(new RegExp(10n)), String(new RegExp(-10n))];
}

class Keys {
	[NaN]() {
		return 1;
	}

	get [null]() {
		return 2;
	}

	static [NaN]() {
		return 3;
	}
}

class Fields {
	[null] = 4;
}

function keyed(o) {
	const { [NaN]: a, [null]: b } = o;
	return [a, b, Object.keys({ [NaN]: 5, [null]: 6 }).join()];
}

function quoted(x, o) {
	return x ? o["read"]() : o.read();
}

function quotedKeys(a, b, value) {
	if (a) return { kept: value };
	if (b) return { "kept": value };
}

function unreadReturns(y) {
	(function () {
		try {
			throw 1;
		} finally {
			return 2;
		}
	})();
	(function (x) {
		if (x) return 3;
		record(x);
	})(y);
	(() => {
		if (record(1)) return 4;
		record(2);
	})();
	record(5),
		(function (x) {
			if (x) return x;
			record(x);
		})(y);
	void (function (x) {
		if (x) return record;
		record(6);
	})(y);
}

function readReturns(y) {
	const assigned = (function (x) {
		if (x) return 7;
		record(x);
	})(y);
	const named = (function count(n) {
		if (!n) return 2;
		return count(n - 1) * 3;
	})(1);
	const passed = [1].map(function (x) {
		if (x) return 8;
		record(x);
	});
	(function (x) {
		if (x) return arguments.length;
		record(x);
	})(y);
	const constructed = new (function (x) {
		if (x) return { built: 9 };
		this.built = 0;
	})(y);
	let written;
	(function (x) {
		if (x) return (written = 10);
		record(x);
	})(y);
	return [assigned, named, passed[0], constructed.built, written];
}

function deadZone(y) {
	try {
		(function (x) {
			if (x) return later;
			record(x);
		})(y);
	} catch (err) {
		return err.name;
	}
	let later = 1;
	return later;
}

async function asyncReturn(y) {
	return (async function (x) {
		if (x) return { then: (resolve) => resolve(11) };
		await record(x);
	})(y);
}

it("should drop `new` before `RegExp` of a BigInt", () => {
	expect(bigIntPatterns()).toEqual(["/10/", "/-10/"]);
});

it("should read computed `NaN` and `null` keys as the names they convert to", () => {
	expect(new Keys().NaN()).toBe(1);
	expect(new Keys().null).toBe(2);
	expect(Keys.NaN()).toBe(3);
	expect(new Fields().null).toBe(4);
	expect(keyed({ NaN: "a", null: "b" })).toEqual(["a", "b", "NaN,null"]);
});

it("should read `a[\"b\"]` as `a.b`", () => {
	const o = { read: () => "r" };
	expect([quoted(0, o), quoted(1, o)]).toEqual(["r", "r"]);
	expect([quotedKeys(1, 0, 1), quotedKeys(0, 1, 2), quotedKeys(0, 0, 3)]).toEqual([
		{ kept: 1 },
		{ kept: 2 },
		undefined
	]);
});

it("should run what an unread function called in place runs", () => {
	log.length = 0;
	unreadReturns(0);
	expect(log).toEqual([0, 1, 5, 0, 6]);
	log.length = 0;
	unreadReturns(1);
	expect(log).toEqual([1, 5]);
});

it("should keep what a function called in place returns where it is read", async () => {
	expect(readReturns(1)).toEqual([7, 6, 8, 9, 10]);
	expect(deadZone(1)).toBe("ReferenceError");
	expect(deadZone(0)).toBe(1);
	expect(await asyncReturn(1)).toBe(11);
});
