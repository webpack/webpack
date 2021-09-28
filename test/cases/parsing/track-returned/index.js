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

	a1();
	a2();
	a3();
	a4();

	expect(result).toBe(0);
});

// TODO
it("should track return in function expression", () => {
	let result = 0;
	const a1 = function () {
		return;
		result = require("./a");
	}

	const a2 = function () {
		if (true) return;
		result = require("./a");
	}

	const a3 = function () {
		{
			{
				if (true) return;
				result = require("./a");
			}
		}
	}

	const a4 = function () {
		if (true) {
			{
				{}
				return;
				result = require("./a");
			}
		}
	}

	a1();
	a2();
	a3();
	a4();

	expect(result).toBe(0);
});

// TODO
it("should track return in arrow function expression", () => {
	let result = 0;
	const a1 = () => {
		return;
		result = require("./a");
	}

	const a2 = () => {
		if (true) return;
		result = require("./a");
	}

	const a3 = () => {
		{
			{
				if (true) return;
				result = require("./a");
			}
		}
	}

	const a4 = () => {
		if (true) {
			{
				{}
				return;
				result = require("./a");
			}
		}
	}

	a1();
	a2();
	a3();
	a4();

	expect(result).toBe(0);
});
