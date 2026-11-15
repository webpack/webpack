class Counter {
	#used() {
		return 1;
	}

	#unusedMethod() {
		return 2;
	}

	get #unusedGetter() {
		return 3;
	}

	static #unusedStatic() {
		return 4;
	}

	read() {
		return this.#used();
	}
}

function counted(log) {
	return {
		*[Symbol.iterator]() {
			log.push("next");
			yield 1;
		}
	};
}

function spreadOnly(log) {
	(() => {})(...counted(log));
	(function () {})(log.push("arg"), ...counted(log));
	return log;
}

function sequenceTail(g) {
	return [(g(), {})?.b, (g(), [1])?.length];
}

function protoPattern(o) {
	const { ["__proto__"]: read } = o;
	const literal = { ["__proto__"]: null };
	return [read === Object.prototype, Object.getPrototypeOf(literal) === Object.prototype];
}

it("should drop only the private members nothing reads", () => {
	expect(new Counter().read()).toBe(1);
});

it("should keep the iteration an empty function's spread arguments run", () => {
	expect(spreadOnly([])).toEqual(["next", "arg", "next"]);
});

it("should read a sequence's last value without the needless optional link", () => {
	const calls = [];
	expect(sequenceTail(() => calls.push(1))).toEqual([undefined, 1]);
	expect(calls).toEqual([1, 1]);
});

it("should read `__proto__` in a pattern as the computed key does", () => {
	expect(protoPattern({})).toEqual([true, true]);
});
