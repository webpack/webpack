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

function early() {
	late("early");
}

/*#__NO_SIDE_EFFECTS__*/
function declared(name) {
	log.push(name);
	return name;
}

var expression = /*#__NO_SIDE_EFFECTS__*/ function (name) {
	log.push(name);
	return name;
};

/*#__NO_SIDE_EFFECTS__*/
var statement = function (name) {
	log.push(name);
	return name;
};

/*#__NO_SIDE_EFFECTS__*/
var late = function (name) {
	log.push(name);
	return name;
};

function plain(name) {
	log.push(name);
	return name;
}

/*#__NO_SIDE_EFFECTS__*/
function reassigned(name) {
	log.push(name);
}
reassigned = function (name) {
	log.push("again " + name);
};

it("should drop an unread call to a function `#__NO_SIDE_EFFECTS__` marks", () => {
	declared("declared");
	expression("expression");
	statement("statement");
	statement(declared("nested"));
	plain("plain");
	early();
	reassigned("reassigned");
	new declared("new");
	expect(declared("read")).toBe("read");
	expect(log).toEqual(["plain", "early", "again reassigned", "new", "read"]);
});

function beforeSet() {
	try {
		invoke();
	} catch (err) {
		return err.name;
	}
	/*#__NO_SIDE_EFFECTS__*/
	var unset = function () {};
	function invoke() {
		unset();
	}
	return "ran";
}

function maybeSet(set) {
	if (set) {
		/*#__NO_SIDE_EFFECTS__*/
		var sometimes = function () {};
	}
	try {
		sometimes();
	} catch (err) {
		return err.name;
	}
	return "ran";
}

it("should keep a call that may run before the name is set", () => {
	expect(beforeSet()).toBe("TypeError");
	expect(maybeSet(false)).toBe("TypeError");
	expect(maybeSet(true)).toBe("ran");
});
