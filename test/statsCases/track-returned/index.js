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

it("should work correct for lonely throw", () => {
	throw 1;
	require("fail");
});

it("should work correct for lonely return", () => {
	return;
	require("fail");
});

it("should work correct for try catch and loops", () => {
	try {
		throw 1;
		require("fail");
	} catch (e) {
		require('./used');
	}

	try {
		if (true) {
			throw 1;
			require("fail7");
		}

		require("fail2");
	} catch (e) {
		require('./used');
	}

	try {
		if (true) {
			throw 1;
			require("fail4");
		}

		require("fail2");
	} catch (e) {
		require('./used');
	}

	try {
		try {
			if (true) {
				throw 1;
				require("fail5a");
			}

			require("fail2");
		} catch (e) {
			require('./used7');
		}

		require('./used8');
	} catch (e) {
		require('./used9');
	}

	function test() {
		try {
			return;
			require("fail");
		} finally {
			require('./used');
		}
	}

	function test1() {
		try {
			try {
				if (true) {
					return;
					require("fail1");
				}

				require("fail2");
			} catch (e) {
				require('./used16');
			}

			require('fail4');
		} catch (e) {
			require('./used17');
		} finally {
			require('./used18');
		}
	}

	function test2() {
		try {
			try {
				if (true) {
					return;
					require("fail1");
				}

				require("fail2");
			} catch (e) {
				require('./used19');
			}

			require('fail4');
		} catch (e) {
			require('./used17');
		} finally {
			require('./used18');
		}

		require('fail5');
	}

	function test3() {
		if (true) {
			try {
				if (true) {
					throw new Error('test')
				}
				require("fail");
				return false;
			} catch (err) {
				return false;
			} finally {
				require("./used10");
			}
		}
	}

	function fn() {
		throw new Error('test');
	}

	function test4() {
		try {
			return fn()
		} catch (err) {
			require("./used11")
		} finally {
			require("./used12")
		}
	}

	function test5() {
		try {
			return fn()
		} catch (err) {
			// return;
			require("./used13")
		} finally {
			require("./used14")
		}
	}

	function test6() {
		try {
			return fn()
		} catch (err) {
			return;
			require("fail")
		} finally {
			require("./used15")
		}

		require("fail");
	}

	function test7() {
		return next();

		function next() {
			return require("./used20");
		}
	}

	async function test8() {
		try {
			let routeModule = fn();

			return routeModule;
		} catch (error) {
			if (test && require("./used21")) {
					throw error;
			}
		}
	}

	async function test9() {
		try {
			let routeModule = fn();

			return routeModule;
		} catch (error) {
			if (test && import.meta.hot) {
				require("fail");
			}
		}
	}

	function test10() {
		return require("./used23"), require("./used24");
	}

	function test11() {
		try {
			let routeModule = fn();

			return routeModule;
		} catch (error) {
			const test = 1;
			require("./used25");
		} finally {
			const test = 1;
			require("./used26");
		}
	}

	function test12() {
		try {
			return fn();
		} catch (error) {
			return;
			require("fail1");
		} finally {
			return;
			require("fail2");
		}
		import("fail3");
	}

	function test13() {
		try {
			return fn();
		} catch (error) {
			require("./used27");
			return;
		} finally {
			require("./used28");
			return;
		}
		import("fail");
	}

	function test13() {
		try {
			fn();
		} catch (error) {
			return;
		} finally {
			return;
		}

		require("./used29");
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

it("should work correct for if", () => {
	if (true) {
		require('./used');
		return;
	}

	require("fail");
});

it("should work correct for if #2", () => {
	if (false) {
		require("fail");
	} else {
		require('./used');
	}
});

it("should work correct for if #3", () => {
	if (false) {
		require("fail");
	} else if (true) {
		require('./used');
	} else {
		require("fail");
	}
});

it("should work correct for if #4", () => {
	if (false) {
		require("fail");
	} else if (false) {
		require("fail");
	} else {
		require('./used');
	}
});

it("should not include unused assets", (done) => {
	let a, b;
	(function() {
		try {
			return;

			require("fail");
		} finally {
			a = require('./used')

			{
				try {
					return;
					require("fail");
				} finally {
					b = require('./used')
				}
			}

			require("fail");
		}
	})();
});

it("should work correct for classes", () => {
	class Test {
		value = true ? require('./used') : require("fail");

		static value = true ? require('./used') : require("fail");

		constructor(height = true ? require('./used') : require("fail"), width) {
			if (true) return;
			return require("fail");
		}

		method() {
			if (true) return;
			return require("fail");
		}

		static method() {
			if (true) return;
			return require("fail");
		}

		get area() {
			if (true) return;
			return require("fail");
		}

		set area(value) {
			if (true) return;
			return require("fail");
		}
	}
});

function top1() {
	return;
	require("fail");
}

if (false) {
	require("fail");
} else if (true) {
	require('./used');
} else {
	require("fail");
}

const test = true ? require('./used') : require("fail");

const a = rand() ? 1 : 2;

switch (a) {
	case 1: {
		if (true) require("./used22")
		else require("fail");
	}
	case 2:
		if (false) require("fail");
	default:
		require("./used2");
}

if (true) {
	require("./used5");
}

if (false) {
	require("fail");
}

require("./used6");
