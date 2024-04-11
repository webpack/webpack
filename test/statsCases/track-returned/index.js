function rand() {
	return Math.random() > 0.5;
}

it("should track return in function declaration", () => {
	function a1() {
		return;
		require("fail");
	}

	function a2() {
		if (true) return;
		require("fail");
	}

	function a3() {
		{
			{
				if (true) return;
				require("fail");
			}
		}
	}

	function a4() {
		if (true) {
			{
				{}
				return;
				require("fail");
			}
		}
	}

	function a5() {
		if (rand()) {
			return;
			throw require("fail");
		}

		if (rand()) return;
		require("./used3");
	}

	a1();
	a2();
	a3();
	a4();
	a5();
});

it("should track return in function expression", () => {
	const a1 = function () {
		return;
		require("fail");
	}

	const a2 = function () {
		if (true) return;
		require("fail");
	}

	const a3 = function () {
		{
			{
				if (true) return;
				require("fail");
			}
		}
	}

	const a4 = function () {
		if (true) {
			{
				{}
				return;
				require("fail");
			}
		}
	}

	const a5 = function () {
		if (rand()) {
			return;
			throw require("fail");
		}
	}

	a1();
	a2();
	a3();
	a4();
	a5();
});

it("should track return in arrow function expression", () => {
	const a1 = () => {
		return;
		require("fail");
	}

	const a2 = () => {
		if (true) return;
		result = require("fail");
	}

	const a3 = () => {
		{
			{
				if (true) return;
				result = require("fail");
			}
		}
	}

	const a4 = () => {
		if (true) {
			{
				{}
				return;
				result = require("fail");
			}
		}
	}

	const a5 = () => {
		if (rand()) {
			return;
			throw require("fail");
		}
	}

	const a6 = () => {
		if (true) {
			return;
			(() => require("fail"))()
		}
	}

	a1();
	a2();
	a3();
	a4();
	a5();
	a6();
});

it("should work correct for try catch and loops", () => {
	try {
		throw 1;
		require("fail");
	} catch (e) {
		require('./used');
	}

	for(let i = 0; i < 1; i++)
		if (rand())
			require('./used1');

	for(let i = 0; i < 1; i++) {
		if (true) {
			require('./used4');
			return;
		}
		import("fail");
	}

	try {
		if (rand()) {
			if (true) return;
			require("fail");
		}
		return;
	} catch {}

	require("fail");
});

it("should handle edge case with switch case", () => {
	const a = rand() ? 1 : 2;
	switch (a) {
		case 1: {
			if (true) return;
			return require("fail");
		}
		case 2:
			if (true) return;
			return require("fail");
		default:
			require("./used2");
	}
});
