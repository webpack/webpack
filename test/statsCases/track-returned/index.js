function rand() {
	return Math.random() > 0.5;
}

it("should track return in function declaration", () => {
	let result = 0;
	function a1() {
		return;
		result = require("./a");
	}

	function a2() {
		if (true) return;
		result = require("./a");
	}

	function a3() {
		{
			{
				if (true) return;
				result = require("./a");
			}
		}
	}

	function a4() {
		if (true) {
			{
				{}
				return;
				result = require("./a");
			}
		}
	}

	function a5() {
		if (rand()) {
			return;
			throw require("./a");
		}
	}

	a1();
	a2();
	a3();
	a4();
	a5();

	expect(result).toBe(0);
});

it("should track return in function expression", () => {
	let result = 0;
	const a1 = function () {
		return;
		result = require("./b");
	}

	const a2 = function () {
		if (true) return;
		result = require("./b");
	}

	const a3 = function () {
		{
			{
				if (true) return;
				result = require("./b");
			}
		}
	}

	const a4 = function () {
		if (true) {
			{
				{}
				return;
				result = require("./b");
			}
		}
	}

	const a5 = function () {
		if (rand()) {
			return;
			throw require("./b");
		}
	}

	a1();
	a2();
	a3();
	a4();
	a5();

	expect(result).toBe(0);
});

it("should track return in arrow function expression", () => {
	let result = 0;
	const a1 = () => {
		return;
		result = require("./c");
	}

	const a2 = () => {
		if (true) return;
		result = require("./c");
	}

	const a3 = () => {
		{
			{
				if (true) return;
				result = require("./c");
			}
		}
	}

	const a4 = () => {
		if (true) {
			{
				{}
				return;
				result = require("./c");
			}
		}
	}

	const a5 = () => {
		if (rand()) {
			return;
			throw require("./c");
		}
	}

	a1();
	a2();
	a3();
	a4();
	a5();

	expect(result).toBe(0);
});

it("should work correct for try catch and loops", () => {
	try {
		throw 1;
	} catch (e) {
		require('./used');
	}

	for(let i = 0; i < 1; i++)
		if (rand())
			require('./used1');

	try {
		if (rand()) {
			if (true) return;
			require("./c");
		}
	} catch {}
});

it("should handle edge case with switch case", () => {
	const a = rand() ? 1 : 2;
	switch (a) {
		case 1: {
			if (true) return;
			return require('./c');
		}
		case 2:
			if (true) return;
			return require('./c');
		default:
			require('./used2');
	}
});
