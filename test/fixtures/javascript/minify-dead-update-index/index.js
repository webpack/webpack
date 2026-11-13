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

it("should drop a `++` of a `let` holding a number nothing reads", () => {
	const log = [];
	(function () {
		let droppedLetUpdate = 1;
		droppedLetUpdate++;
		log.push("ran");
	})();
	expect(log).toEqual(["ran"]);
});

it("should drop a `--` of a `var` declared with no value", () => {
	const log = [];
	(function () {
		var droppedVarUpdate;
		droppedVarUpdate--;
		log.push("ran");
	})();
	expect(log).toEqual(["ran"]);
});

it("should keep a `++` whose name a later statement reads", () => {
	function keptRead() {
		let readUpdate = 1;
		readUpdate++;
		return readUpdate;
	}
	expect(keptRead()).toBe(2);
});

it("should keep a `++` of a parameter, which may hold an object", () => {
	const log = [];
	function keptParameter(paramUpdate) {
		paramUpdate++;
	}
	keptParameter({ valueOf: () => log.push("param") });
	expect(log).toEqual(["param"]);
});

it("should keep a `++` of a name a call sets", () => {
	const log = [];
	function make() {
		return { valueOf: () => log.push("call") };
	}
	(function () {
		let callUpdate = make();
		callUpdate++;
	})();
	expect(log).toEqual(["call"]);
});

it("should keep a `++` of a `var` a second declaration sets to an object", () => {
	const log = [];
	(function () {
		var redeclaredUpdate = 1;
		var redeclaredUpdate = { valueOf: () => log.push("redeclared") };
		redeclaredUpdate++;
	})();
	expect(log).toEqual(["redeclared"]);
});

it("should keep a `++` of a name a destructuring declares", () => {
	const log = [];
	(function () {
		let { patternUpdate } = { patternUpdate: { valueOf: () => log.push("pattern") } };
		patternUpdate++;
	})();
	expect(log).toEqual(["pattern"]);
});

it("should keep a `++` of a member, which `unused` never names", () => {
	const obj = { p: 1 };
	(function () {
		obj.p++;
	})();
	expect(obj.p).toBe(2);
});

it("should drop a dead `++` in a second chunk too", () =>
	import("./second").then(({ default: runSecondChunkUpdate }) => {
		expect(runSecondChunkUpdate()).toEqual(["second-chunk-ran"]);
	}));
