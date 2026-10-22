it("should read an inherited array element when converting a hole in a template", () => {
	let result;
	Array.prototype[0] = "inherited";
	try {
		result = `${[,]}`;
	} finally {
		delete Array.prototype[0];
	}
	expect(result).toBe("inherited");
});

it("should read a middle hole through Object.prototype", () => {
	let result;
	Object.prototype[1] = "inherited";
	try {
		result = `before${[1, , 3]}after`;
	} finally {
		delete Object.prototype[1];
	}
	expect(result).toBe("before1,inherited,3after");
});

it("should run an inherited getter once when converting a hole", () => {
	let result;
	let reads = 0;
	Object.defineProperty(Array.prototype, 0, {
		configurable: true,
		get() {
			reads++;
			return "inherited";
		}
	});
	try {
		result = `${[,]}`;
	} finally {
		delete Array.prototype[0];
	}
	expect(result).toBe("inherited");
	expect(reads).toBe(1);
});

it("should preserve an error thrown by an inherited element getter", () => {
	const error = new Error("inherited element failed");
	let caught;
	let result;
	Object.defineProperty(Array.prototype, 0, {
		configurable: true,
		get() {
			throw error;
		}
	});
	try {
		result = `${[,]}`;
	} catch (value) {
		caught = value;
	} finally {
		delete Array.prototype[0];
	}
	expect(caught).toBe(error);
	expect(result).toBeUndefined();
});

it("should distinguish explicit null and undefined elements from holes", () => {
	let result;
	Array.prototype[0] = "inherited";
	try {
		result = `${[null]}|${[undefined]}|${[]}|${[1, null, undefined, "x"]}`;
	} finally {
		delete Array.prototype[0];
	}
	expect(result).toBe("|||1,,,x");
});
