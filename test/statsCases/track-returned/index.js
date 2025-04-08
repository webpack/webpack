function rand() {
	return Math.random() > 0.5;
}

it("should track return in function declaration", () => {
	function a1() {
		return;
		require("fail1");
	}

	function a2() {
		if (true) return;
		require("fail2");
	}

	function a3() {
		{
			{
				if (true) return;
				require("fail3");
			}
		}
	}

	function a4() {
		if (true) {
			{
				{}
				return;
				require("fail4");
			}
		}
	}

	function a5() {
		if (rand()) {
			return;
			throw require("fail5");
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
		require("fail6");
	}

	const a2 = function () {
		if (true) return;
		require("fail7");
	}

	const a3 = function () {
		{
			{
				if (true) return;
				require("fail8");
			}
		}
	}

	const a4 = function () {
		if (true) {
			{
				{}
				return;
				require("fail9");
			}
		}
	}

	const a5 = function () {
		if (rand()) {
			return;
			throw require("fail10");
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
		require("fail11");
	}

	const a2 = () => {
		if (true) return;
		result = require("fail12");
	}

	const a3 = () => {
		{
			{
				if (true) return;
				result = require("fail13");
			}
		}
	}

	const a4 = () => {
		if (true) {
			{
				{}
				return;
				result = require("fail14");
			}
		}
	}

	const a5 = () => {
		if (rand()) {
			return;
			throw require("fail15");
		}
	}

	const a6 = () => {
		if (true) {
			return;
			(() => require("fail16"))()
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
	require("fail17");
});

it("should work correct for lonely return", () => {
	return;
	require("fail18");
});

it("should work correct for try catch and loops", () => {
	try {
		throw 1;
		require("fail19");
	} catch (e) {
		require('./used');
	}

	try {
		if (true) {
			throw 1;
			require("fail20");
		}

		require("fail21");
	} catch (e) {
		require('./used');
	}

	try {
		if (true) {
			throw 1;
			require("fail22");
		}

		require("fail23");
	} catch (e) {
		require('./used');
	}

	try {
		try {
			if (true) {
				throw 1;
				require("fail24");
			}

			require("fail25");
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
			require("fail26");
		} finally {
			require('./used');
		}
	}

	function test1() {
		try {
			try {
				if (true) {
					return fn();
					require("fail27");
				}

				require("fail28");
			} catch (e) {
				require('./used16');
			}

			// TODO potential improvement
			require('./used69');
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
					require("fail30");
				}

				require("fail31");
			} catch (e) {
				require('./used19');
			}

			require('./used48');
		} catch (e) {
			require('./used17');
		} finally {
			require('./used18');
		}

		require('./used35');
	}

	function test3() {
		if (true) {
			try {
				if (true) {
					throw new Error('test')
				}
				require("fail33");
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
			require("fail34")
		} finally {
			require("./used15")
		}

		require("fail35");
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
				require("fail36");
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
			require("fail37");
		} finally {
			return;
			require("fail38");
		}
		import("fail39");
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
		import("fail40");
	}

	function test13() {
		try {
			fn();
		} catch (error) {
			return;
		} finally {
			return;
		}

		require("fail78");
	}

	function test14() {
		throw 1, require("./used34");
		require("fail41")
	}

	function test15() {
		try {
			return this || require("./used30");
		} catch {
			if (true) return;
			require("fail42");
		}

		require("fail");
	}

	function test16() {
		try {
			return this || require("./used30");
		} finally {
			if (true) return;
			require("fail43");
		}

		require("fail44");
	}

	function test17() {
		try {
			return fn();
		} finally {
			return;
		}

		require("fail45");
	}

	function test18() {
		try {
			return fn();
		} catch (e) {

		} finally {
			require("./used31")
			return;
		}

		require("fail46");
	}

	function test19() {
		try {
			return fn();
		} catch (e) {
			return fn()
		} finally {
			require("./used32")
			return;
		}

		require("fail47")
	}

	function test19() {
		try {
			return fn();
		} finally {
			require("./used37")
			return;
		}

		require("fail79")
	}

	function test20() {
		try {
			return fn();
		} catch {
			require("./used38")
			return;
		}

		require("fail80")
	}

	function test21() {
		try {
			try {
				throw '1';
			} catch(x) {
				throw '2';
			}

			require("fail")
		} catch(x) {
			require("./used39");
		}

		require("./used40");
	}

	function test22() {
		try {
			try {
				throw '1';
			} catch(x) {
				throw '2';
			} finally {
				throw '3';
			}

			require("fail")
		} catch(x) {
			require("./used39");
		}

		require("./used40");
	}

	function test23() {
		try {
			try {} finally {
				throw '3';
			}

			require("fail")
		} catch(x) {
			require("./used39");
		}

		require("./used40");
	}

	function test24() {
		try {
			try {

			} finally {
				throw '3';
			}

			require("fail81")
		} catch(x) {
			// handle it
		} finally {}

		require("./used42");
	}

	function test25() {
		try {
			try {
				try {

				} finally {
					throw '3';
				}

				require("fail81")
			} catch(x) {
				// handle it
			} finally {
				throw 1
			}
		} catch (e) {
			require("./used41")
		}
	}

	function test25a() {
		try {
			return;
		} finally {
		}

		require("fail");
	}

	function test26() {
		try {
			return;
		} finally {
			throw 1;
		}

		require("fail");
	}

	function test27() {
		try {
			fn();
		} finally {
			require("./used43");
		}

		require("./used44");
	}

	function test28() {
		try {
			return fn();
		} finally {
		 	require("./used45");
		}

		require("fail");
	}

	function test29() {
		try {
			throw 1;
		} finally {
			require("./used46");
		}

		require("fail");
	}

	function test30() {
		try {
			return fn();
		} catch {
			return require("./used50");
		}

		require("fail");
	}

	function test30() {
		try {
			throw 1;
			require("fail");
		} catch {
			return 2;
			require("fail");
		}

		require("fail");
	}

	function test31() {
		try {
			throw 1;
			require("fail");
		} catch {
			return 2;
			require("fail");
		} finally {
			require("./used47")
		}

		require("fail");
	}

	function test32() {
		try {
		} catch (e) {
		} finally {
		}

		require("./used29");
	}

	function test33() {
		try {
			throw 1;
		} finally {
		}

		require("fail");
	}

	function test33() {
		try {
			return 1;
		} finally {
		}

		require("fail");
	}

	function test34() {
		try {
			return 1;
		} catch (e) {
			return 1;
		}

		require("fail");
	}

	function test35() {
		try {
			try {
				return fn();
			} catch (e) {
				throw 1;
			}

			require("fail");
		} catch (e) {
			require("./used33");
		}

		require("./used51");
	}

	function test36() {
		test();

		throw 1;

		function test() {
			require("./used67")
		}
	}

	for(let i = 0; i < 1; i++)
		if (rand())
			require('./used1');

	for(let i = 0; i < 1; i++) {
		if (true) {
			require('./used4');
			return;
		}
		import("fail48");
	}

	try {
		if (rand()) {
			if (true) return;
			require("fail49");
		}
		return;
	} catch {}

	require("./used36");
});

it("should handle edge case with switch case", () => {
	const a = rand() ? 1 : 2;
	switch (a) {
		case 1: {
			if (true) return;
			return require("fail51");
		}
		case 2:
			if (true) return;
			return require("fail52");
		default:
			require("./used2");
	}
});

it("should work correct for if", () => {
	if (true) {
		require('./used');
		return;
	}

	require("fail53");
});

it("should work correct for if #2", () => {
	if (false) {
		require("fail54");
	} else {
		require('./used');
	}
});

it("should work correct for if #3", () => {
	if (false) {
		require("fail55");
	} else if (true) {
		require('./used');
	} else {
		require("fail56");
	}
});

it("should work correct for if #4", () => {
	if (false) {
		require("fail57");
	} else if (false) {
		require("fail58");
	} else {
		require('./used');
	}
});

it("should work correct for if #5", () => {
	if (rand())
		return;
	else if (rand())
		return;
	else {
		const test = 1;
		require("./used52")
	}
});

it("should work correct for if #6", () => {
	if (rand())
		return;
	else {
		const test = 1;
		require("./used53")
	}
});

it("should work correct for if #7", () => {
	if (rand())
		return;
	else
		return;

	require("fail");
});

it("should work correct for if #8", () => {
	if (rand()) {
		rand()
	} else if (rand()) {
		rand()
	} else
		return;

	require("./used70");
});

it("should work correct for if #9", () => {
	if (true) {
		return;
	} else if (rand()) {
		require("fail");
	} else
		require("fail");

	require("fail");
});

it("should work correct for if #10", () => {
	if (rand()) {
		return;
	} else if (true) {
		return;
	} else
		require("fail");

	require("fail");
});

it("should work correct for if #11", () => {
	if (false)
		return;
	else if (rand()) {
		return;
	} else
		return;

	require("fail");
});

it("should work correct for if #12", () => {
	if (false)
		return;
	else if (false) {
		return;
	} else
		return;

	require("fail");
});

it("should work correct for if #13", () => {
	if (true)
		return;
	else if (true) {
		return;
	} else
		return;

	require("fail");
});

it("should work correct for if #13", () => {
	if (false)
		return;
	else if (false) {
		return;
	} else {}

	require("./used54");
});

it("should work correct for if #14", () => {
	if (fn())
		return;
	else if (fn()) {
		fn()
		require("./used55");
	}

	require("./used56");
});

it("should work correct for if #15", () => {
	if (true) {
		return;
	}

	require("fail");
});

it("should work correct for if #16", () => {
	if (true) return;

	const test = 1;
	require("fail");
});

it("should work correct for if #17", () => {
	if (false) return;

	const test = 1;
	require("./used57");
});

it("should work correct for if #18", () => {
	if (rand()) return;

	const test = 1;
	require("./used58");
});

it("should work correct for if #19", () => {
	if (!rand())
		// if reference flag is false ,then show the form and update the model with relative type list
		return rand();
	else {
		if (rand()) {
			rand();
			require("./used59")
			rand();
		} else {
			rand();
			require("./used60");
			rand();
		}
	}

	require("./used61");
});

it("should work correct for if #20", () => {
	if (rand()) {
		return;
	} else if (rand()) {
		return;
	} else if (rand()) {
		return;
	} else if (rand()) {
		return;
	}

	require("./used62");
});

it("should work correct for if #21", () => {
	if (rand())
		return;
	else if (rand())
		return;
	else if (rand())
		return;
	else if (rand())
		return;

	require("./used63");
});

it("should work correct for if #22", () => {
	if (rand()) {
		if (true) {
			return;
		} else if (rand()) {
			return;
		} else {
			return;
		}

		require("fail");
	} else {
		return;
		require("fail");
	}

	require("fail");
});

it("should work correct for if #23", () => {
	if (rand()) {
		if (rand()) {
			return;
		} else if (true) {
			return;
		} else {
			return;
		}

		require("fail");
	} else {
		return;
		require("fail");
	}

	require("fail");
});

it("should work correct for if #24", () => {
	if (rand()) {
		if (rand()) {
			return;
		} else if (rand()) {
			return;
		} else {
			return;
		}
	}

	require("./used64");
});

it("should work correct for if #25", () => {
	if (rand()) {
		if (rand()) {
			return;
		} else if (rand()) {
			return;
		} else {
			return;
		}
	} else if (rand()) {
		return;
	}

	require("./used65");
});

it("should work correct for if #26", () => {
	if (rand()) {
		if (rand()) {
			return;
		} else if (rand()) {
			return;
		} else {
			return;
		}
	} else if (rand()) {
		return;
	} else if (rand()) {}

	require("./used66");
});

it("should work correct for if #22", () => {
	if (rand()) {
		if (rand()) {
			return;
		} else if (rand()) {
			return;
		} else {
			return;
		}

		// require("fail");
	} else if (rand()) {
		if (rand()) {
			return;
		} else {
			return;
		}

		require("fail");
	} else {
		return;
	}

	require("fail");
});

it("should work correct for if #23", () => {
	if (rand()) {
		if (rand())
			return;
		else if (rand())
			return;
		else
			return;

		require("fail");
	} else if (rand()) {
		if (rand())
			return;
		else
			return;

		require("fail");
	} else {
		return;
	}

	require("fail");
});

it("should work correct for if #24", () => {
	if (rand()) {
		if (rand()) {
			return;
		} else {
			return;
		}
	} else {
		return;
	}

	require("fail");
});

it("should work correct for if #25", () => {
	if (rand())
		return;
	else
		if (rand())
			return;
		else
			return;

	require("fail");
});

it("should work correct for if #26", () => {
	if (rand()) {
		return;
	} else
		if (rand())
			return;
		else
			return;

	require("fail");
});

it("should work correct for if #27", () => {
	if (rand())
		return;
	else {
		if (rand())
			return;
		else
			return;
	}

	require("fail");
});

it("should work correct for if #28", () => {
	if (rand()) {
		if (rand()) {
			return;
		} else {
			const test = 1;
			require("./used68")
			return;
		}

		require("fail");
	}
});

it("should work correct for if #29", () => {
	if (rand()) {
		return;
		if (rand()) {
			return;
		} else {
			return;
		}

		require("fail");
	}
});

it("should work correct for if #30", () => {
	if (rand()) {
		rand();
		return;
	} else {
		rand();
	}

	require("./used71")
});

it("should work correct for if #31", () => {
	if (rand()) {
		rand();
	} else {
		rand();
		return;
	}

	require("./used72")
});

it("should work correct for if #32", () => {
	if (rand()) {
		rand();
		return;
	} else {
		rand();
		return;
	}

	require("fail");
});

it("should work correct for if #33", () => {
	if (rand()) {
		rand();
		return;
	} else if (rand()) {
		rand()
	} else {
		rand();
		return;
	}

	require("./used73");
});

it("should work correct for if #34", () => {
	if (rand()) {
		rand();
		return;
	} else if (rand()) {
		rand();
		return;
	} else {
		rand();
	}

	require("./used74");
});

it("should work correct for if #35", () => {
	if (rand()) {
		rand();
	} else if (rand()) {
		rand();
		return;
	} else {
		rand();
		return;
	}

	require("./used75");
});

it("should work correct for if #36", () => {
	if (rand()) {
		if (rand()) {
			return;
		} else if (rand()) {
			return;
		} else {
			return;
		}
		require("fail");
	} else if (rand()) {
		rand();
	} else {
		rand();
	}

	require("./used76");
});

it("should work correct for if #37", () => {
	if (rand()) {
		rand();
	} else if (rand()) {
		if (rand()) {
			return;
		} else if (rand()) {
			return;
		} else {
			return;
		}
		require("fail");
	} else {
		rand();
	}

	require("./used77");
});

it("should work correct for if #38", () => {
	if (rand()) {
		rand();
	} else if (rand()) {
		rand();
	} else {
		if (rand()) {
			return;
		} else if (rand()) {
			return;
		} else {
			return;
		}
		require("fail");
	}

	require("./used78");
});


it("should not include unused assets", (done) => {
	let a, b;
	(function() {
		try {
			return;

			require("fail59");
		} finally {
			a = require('./used')

			{
				try {
					return fn();
					require("fail60");
				} finally {
					b = require('./used')
				}
			}

			require("./used49");
		}
	})();
});

it("should work correct for classes", () => {
	class Test {
		value = true ? require('./used') : require("fail62");

		static value = true ? require('./used') : require("fail63");

		constructor(height = true ? require('./used') : require("fail64"), width) {
			if (true) return;
			return require("fail65");
		}

		method() {
			if (true) return;
			return require("fail66");
		}

		static method() {
			if (true) return;
			return require("fail67");
		}

		get area() {
			if (true) return;
			return require("fail68");
		}

		set area(value) {
			if (true) return;
			return require("fail69");
		}
	}
});

function top1() {
	return;
	require("fail70");
}

if (false) {
	require("fail71");
} else if (true) {
	require('./used');
} else {
	require("fail72");
}

const test = true ? require('./used') : require("fail73");

const a = rand() ? 1 : 2;

switch (a) {
	case 1: {
		if (true) require("./used22")
		else require("fail74");
	}
	case 2:
		if (false) require("fail75");
	default:
		require("./used2");
}

if (true) {
	require("./used5");
}

if (false) {
	require("fail77");
}

require("./used6");
