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
