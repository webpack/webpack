var ran = [];

function track(value) {
	ran.push(value);
	return value;
}

function characters(index) {
	var at = 1;
	return [
		"ab"[1],
		"ab"[at],
		"ab"["length"],
		"ab"[5],
		"ab"[index],
		"ab"["x"]
	];
}

function templates(name) {
	var both = `say "hi" it's`;
	var plain = `plain`;
	var tagged = String.raw`a\nb`;
	`statement`;
	return [plain, both, tagged, `${name}!`, String(`\${ beep }`)];
}

function patternDefaults(source, empty) {
	var [first = void 0, second = 2] = source;
	var { known = undefined, renamed: other = void 0, given = 4 } = empty;
	var [kept = /*! keep */ void 0] = source;
	function length(parameter = void 0) {
		return parameter;
	}
	class Holder {
		method(parameter = void 0) {
			return parameter;
		}
	}
	return [
		first,
		second,
		known,
		other,
		kept,
		given,
		length.length,
		length(),
		Holder.prototype.method.length
	];
}

function holes(index) {
	return [
		typeof [1, 2, , 3][2],
		[1, 2, , 3][3],
		[1, , 2][1.5],
		[1, , 2][-1],
		[1, , 2][7],
		[1, , 2][index],
		[track("hole"), , 2][1],
		[...[1], , 2][1],
		[1, , 2][1] === void 0
	];
}

function truthy(log) {
	var made = [1] && "array";
	var pattern = /a/ || log.push("never");
	var fn = function () {} && "function";
	var object = {} && "object";
	var runs = [track("made")] && "runs";
	var unset = (unset || { size: 1 }).size;
	return [made, typeof pattern, fn, object, runs, unset];
}

function deletes(object, flag) {
	return [
		delete (1 ? void 0 : object),
		delete (0 ? object : void 0),
		delete (1 ? 2 : object),
		delete (1 ? object.p : 2),
		delete (flag ? object.p : 2),
		object.p
	];
}

function deadVars() {
	var off = 0;
	if (off) {
		let blocked = 6;
		const fixed = 12;
		class Gone {}
		var first = track("never"),
			{ named, nested: [, last = track("never"), ...rest] } = {};
		for (var key in {});
		var first;
		(function () {
			var inner;
		})();
	}
	if (off) {
		var unread;
	}
	return [typeof first, named, last, rest, key];
}

function deadFunction(flag) {
	var off = 0;
	var on = 1;
	if (off) {
		function declared() {}
		var withFunction;
	}
	if (on) flag.push("kept");
	else var picked;
	if (on) flag.push("on");
	else flag.push("off");
	if (flag.length) flag.push("else");
	else if (off) {
		var fromElse;
	}
	if (off) {
		/*! kept */
		var commented;
	}
	return [typeof withFunction, typeof picked, typeof fromElse, typeof commented];
}

function loops(limit, thrown) {
	var count = 0;
	function step() {
		if (++count > limit) throw count;
	}
	try {
		do {
			step();
		} while (1);
	} catch (e) {
		thrown.push(e);
	}
	try {
		do {
			step();
			step();
		} while (!0);
	} catch (e) {
		thrown.push(e);
	}
	try {
		if (count) do {
				if (step()) step();
			} while (1);
		else step();
	} catch (e) {
		thrown.push(e);
	}
	do {
		count++;
		if (count > 0) break;
	} while (1);
	return count;
}

function neverCalled() {
	do {} while (1);
	do {
		break;
	} while (1);
	do {
		track("loop");
	} while (/*! kept */ 1);
}

function switches(log, done) {
	found: {
		log.push("before");
		switch (1) {
			case 1:
				log.push("one");
				if (done) break found;
				log.push("two");
		}
	}
	if (done) switch (1) {
			case 1:
				log.push("bare");
				if (log.length) log.push("again");
		}
	try {
		switch (1) {
			case 1:
				log.push("try");
				if (done) return log;
				log.push("after");
		}
	} finally {
	}
	if (log.length) {
		switch (1) {
			case 1:
				log.push("body");
				if (done) return log;
				log.push("end");
		}
	}
	return log;
}

it("should fold a string's character, and print a template as a string where shorter", () => {
	expect(characters(0)).toEqual(["b", "b", 2, undefined, "a", undefined]);
	expect(templates("x")).toEqual([
		"plain",
		`say "hi" it's`,
		"a\\nb",
		"x!",
		"${ beep }"
	]);
});

it("should drop a default of `undefined` in a pattern, but a parameter's own", () => {
	expect(patternDefaults([], {})).toEqual([
		undefined,
		2,
		undefined,
		undefined,
		undefined,
		4,
		0,
		undefined,
		0
	]);
});

it("should read a hole of an array literal at a known index as `void 0`", () => {
	ran.length = 0;
	expect(holes(1)).toEqual([
		"undefined",
		3,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		true
	]);
	expect(ran).toEqual(["hole"]);
});

it("should read an array, object, function or regular expression made in place as truthy", () => {
	ran.length = 0;
	expect(truthy([])).toEqual([
		"array",
		"object",
		"function",
		"object",
		"runs",
		1
	]);
	expect(ran).toEqual(["made"]);
});

it("should fold a `delete` of a conditional whose test is known", () => {
	expect(deletes({ p: 1 }, ran.length === 0)).toEqual([true, true, true, true, true, 1]);
});

it("should print an `if` known false as the `var` names its branch declares that something reads", () => {
	ran.length = 0;
	expect(deadVars()).toEqual([
		"undefined",
		undefined,
		undefined,
		undefined,
		undefined
	]);
	expect(deadFunction([])).toEqual([
		"undefined",
		"undefined",
		"undefined",
		"undefined"
	]);
	expect(ran).toEqual([]);
});

it("should print a `do` loop forever as `for(;;)` with its body unbraced", () => {
	var thrown = [];
	expect(loops(3, thrown)).toBe(7);
	expect(thrown).toEqual([4, 5, 6]);
	expect(typeof neverCalled).toBe("function");
});

it("should print a folded `switch` bare in a block keeping its braces", () => {
	expect(switches([], false)).toEqual([
		"before",
		"one",
		"two",
		"try",
		"after",
		"body",
		"end"
	]);
	expect(switches([], true)).toEqual([
		"before",
		"one",
		"bare",
		"again",
		"try"
	]);
});

it("should print the branch a known test keeps in a chunk declaring nothing dead", () =>
	import("./other").then(({ default: pick }) => {
		expect(pick([])).toEqual(["kept"]);
	}));
