it("should drop a bare `++` or `--` of a name nothing else reads", () => {
	let log = [];
	(function () {
		let aliveBareUpdate = 1;
		aliveBareUpdate++;
	})();
	log.push("ran");
	expect(log).toEqual(["ran"]);
});

it("should drop an eager binary's `--` operand when its name goes unused, running the other side", () => {
	let log = [];
	(function () {
		var leftUpdateVar = 1;
		var leftUpdateUnused = --leftUpdateVar + log.push("left-kept");
	})();
	expect(log).toEqual(["left-kept"]);
});

it("should drop an eager binary's `++` operand on its right side the same way", () => {
	let log = [];
	(function () {
		var rightUpdateVar = 1;
		var rightUpdateUnused = log.push("right-kept") + rightUpdateVar++;
	})();
	expect(log).toEqual(["right-kept"]);
});

it("should keep a `++` whose name a later statement reads", () => {
	function keptUpdateVar() {
		let n = 1;
		n++;
		return n;
	}
	expect(keptUpdateVar()).toBe(2);
});

it("should keep a `--` a `||` only conditionally runs", () => {
	let log = [];
	function shortCircuitUpdate(cond) {
		var n = 5;
		var unused = cond || --n + log.push("ran:" + n);
		return n;
	}
	expect(shortCircuitUpdate(true)).toBe(5);
	expect(log).toEqual([]);
	expect(shortCircuitUpdate(false)).toBe(4);
	expect(log).toEqual(["ran:4"]);
});

it("should keep a `++` of a member, which `unused` never names", () => {
	const obj = { p: 1 };
	(function () {
		obj.p++;
	})();
	expect(obj.p).toBe(2);
});

it("should keep a `++` of a parameter a sloppy function reads through `arguments`", () => {
	function readsArguments(a) {
		a++;
		// Sloppy mode aliases `arguments[0]` to `a`: dropping `a++` would
		// wrongly leave this `1`.
		return arguments[0];
	}
	expect(readsArguments(1)).toBe(2);
});

it("should drop a `--` reached only through a chained assignment, as drop-unused/issue_2768 does", () => {
	let a = "FAIL";
	let c = 1;
	c = (function (b) {
		var d = (b = a);
		var e = --b + (d && (a = "PASS"));
	})();
	expect(a).toBe("PASS");
	expect(typeof c).toBe("undefined");
});
