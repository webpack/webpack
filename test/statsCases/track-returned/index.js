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
				{
				}
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
		require("./used?n=171");
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
				{
				}
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
				{
				}
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
		require("./used?n=164");
	}

	try {
		if (true) {
			throw 1;
			require("fail20");
		}

		require("fail21");
	} catch (e) {
		require("./used?n=165");
	}

	try {
		if (true) {
			throw 1;
			require("fail22");
		}

		require("fail23");
	} catch (e) {
		require("./used?n=166");
	}

	try {
		try {
			if (true) {
				throw 1;
				require("fail24");
			}

			require("fail25");
		} catch (e) {
			require("./used?n=172");
		}

		require("./used?n=173");
	} catch (e) {
		require("./used?n=174");
	}

	function test() {
		try {
			return;
			require("fail26");
		} finally {
			require("./used?n=167");
		}
	}

	function test1a() {
		try {
			try {
				if (true) {
					return fn();
					require("fail27");
				}

				require("fail28");
			} catch (e) {
				require("./used?n=175");
			}

			require("./used?n=176");
		} catch (e) {
			require("./used?n=177");
		} finally {
			require("./used?n=178");
		}
	}

	function test1b() {
		try {
			try {
				if (rand()) {
					return fn();
					require("fail27");
				}

				require("fail28");
			} catch (e) {
				require('./used?n=79');
			}

			require('./used?n=80');
		} catch (e) {
			require('./used?n=81');
		} finally {
			require('./used?n=82');
		}
	}

	function test1c() {
		try {
			try {
				if (true) {
					throw 1;
					require("fail");
				}

				require("fail");
			} catch (e) {
				require('./used?n=83');
			}

			require('./used?n=84');
		} catch (e) {
			require('./used?n=85');
		} finally {
			require('./used?n=86');
		}
	}

	function test1d() {
		try {
			try {
				if (rand()) {
					throw 1;
					require("fail");
				}

				require("./used?n=87");
			} catch (e) {
				require('./used?n=88');
			}

			require('./used?n=89');
		} catch (e) {
			require('./used?n=90');
		} finally {
			require('./used?n=91');
		}
	}

	function test1e() {
		try {
			try {
				if (true) {
					throw 1;
					require("fail");
				}

				require("fail");
			} catch (e) {
				require('./used?n=104');
				return;
			}

			require('fail');
		} catch (e) {
			require('./used?n=92');
		} finally {
			require('./used?n=93');
		}
	}

	function test1f() {
		try {
			try {
				if (rand()) {
					throw 1;
					require("fail");
				}

				require("./used?n=94");
			} catch (e) {
				return require('./used?n=95');
			}

			require('./used?n=96');
		} catch (e) {
			require('./used?n=97');
		} finally {
			require('./used?n=98');
		}
	}

	function test1g() {
		try {
			try {
				if (rand()) {
					throw 1;
					require("fail");
				}

				require("./used?n=99");
			} catch (e) {
				require('./used?n=100');
				throw 1;
			}

			require('./used?n=101');
		} catch (e) {
			require('./used?n=102');
		} finally {
			require('./used?n=103');
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
				require("./used?n=179");
			}

			require("./used?n=180");
		} catch (e) {
			require("./used?n=181");
		} finally {
			require("./used?n=182");
		}

		require("./used?n=41");
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
				require("./used?n=170");
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
			require("./used?n=183");
		} finally {
			require("./used?n=184");
		}
	}

	function test5() {
		try {
			return fn()
		} catch (err) {
			require("./used?n=185");
		} finally {
			require("./used?n=186");
		}
	}

	function test6() {
		try {
			return fn()
		} catch (err) {
			return;
			require("fail34")
		} finally {
			require("./used?n=187");
		}

		require("fail35");
	}

	function test7() {
		return next();

		function next() {
			return require("./used?n=188");
		}
	}

	async function test8() {
		try {
			let routeModule = fn();

			return routeModule;
		} catch (error) {
			if (test && require("./used?n=189")) {
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
		return require("./used?n=190"), require("./used?n=191");
	}

	function test11() {
		try {
			let routeModule = fn();

			return routeModule;
		} catch (error) {
			const test = 1;
			require("./used?n=192")
		} finally {
			const test = 1;
			require("./used?n=193")
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
			require("./used?n=194")
			return;
		} finally {
			require("./used?n=195")
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
		throw 1, require("./used?n=196");
		require("fail41")
	}

	function test15() {
		try {
			return this || require("./used?n=197");
		} catch {
			if (true) return;
			require("fail42");
		}

		require("fail");
	}

	function test16() {
		try {
			return this || require("./used?n=198");
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
			require("./used?n=199");
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
			require("./used?n=200");
			return;
		}

		require("fail47")
	}

	function test19() {
		try {
			return fn();
		} finally {
			require("./used?n=201");
			return;
		}

		require("fail79")
	}

	function test20() {
		try {
			return fn();
		} catch {
			require("./used?n=202");
			return;
		}

		require("fail80")
	}

	function test21() {
		try {
			try {
				throw '1';
			} catch (x) {
				throw '2';
			}

			require("fail")
		} catch (x) {
			require("./used?n=203");
		}

		require("./used?n=204");
	}

	function test22() {
		try {
			try {
				throw '1';
			} catch (x) {
				throw '2';
			} finally {
				throw '3';
			}

			require("fail")
		} catch (x) {
			require("./used?n=205");
		}

		require("./used?n=206");
	}

	function test23() {
		try {
			try {
			} finally {
				throw '3';
			}

			require("fail")
		} catch (x) {
			require("./used?n=207");
		}

		require("./used?n=208");
	}

	function test24() {
		try {
			try {

			} finally {
				throw '3';
			}

			require("fail81")
		} catch (x) {
			// handle it
		} finally {
		}

		require("./used?n=209");
	}

	function test25() {
		try {
			try {
				try {

				} finally {
					throw '3';
				}

				require("fail81")
			} catch (x) {
				// handle it
			} finally {
				throw 1
			}
		} catch (e) {
			require("./used?n=210");
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
			require("./used?n=211");
		}

		require("./used?n=212");
	}

	function test28() {
		try {
			return fn();
		} finally {
			require("./used?n=213");
		}

		require("fail");
	}

	function test29() {
		try {
			throw 1;
		} finally {
			require("./used?n=214");
		}

		require("fail");
	}

	function test30() {
		try {
			return fn();
		} catch {
			return require("./used?n=215");
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
			require("./used?n=216");
		}

		require("fail");
	}

	function test32() {
		try {
		} catch (e) {
		} finally {
		}

		require("./used?n=217");
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
			require("./used?n=218");
		}

		require("./used?n=221");
	}

	function test36() {
		test();

		throw 1;

		function test() {
			require("./used?n=220");
		}
	}

	function test37() {
		try {
			test();
			return false; // Validation skipped = feature disabled.
		} catch {
			test();
			return true; // Validation worked = feature enabled.
		} finally {
			require("./used?n=57");
		}

		require("fail");
	}

	function test38() {
		try {
			try {
				test();
				return false;
			} catch {
				test();
				return true;
			} finally {
				require("./used?n=59");
			}
			require("fail");
			return;
		} catch (e) {
			require("./used?n=240");
			return;
		} finally {
			require("./used?n=60");
		}

		require("fail");
	}

	function test39() {
		try {
			test();
			return;
		} catch (e) {
			try {
				test();
				return false;
			} catch {
				require("./used?n=62");
				return true;
			} finally {
				require("./used?n=63");
			}
			return;
		} finally {
			require("./used?n=64");
		}

		require("fail");
	}

	function test40() {
		try {
			return;
		} finally {
			require("./used?n=105");
		}

		require("fail");
	}

	function test41() {
		try {
			throw 1;
		} catch (e) {
			require("./used?n=106");
		} finally {
			require("./used?n=107");
		}

		require("./used?n=108");
	}

	function test42() {
		try {
			return;
		} catch (e) {
			return;
		} finally {
			require("./used?n=109");
		}

		require("fail");
	}

	function test43() {
		try {
			return;
		} finally {
			require("./used?n=110");
		}

		require("fail");
	}

	function test44() {
		try {
			return rand();
		} catch (e) {
			throw 1;
		} finally {
			require("./used?n=111");
		}

		require("fail");
	}

	function test45() {
		try {
			throw 1;
		} catch (e) {
			return rand();
		} finally {
			require("./used?n=112");
		}

		require("fail");
	}

	function test46() {
		try {
			throw 1;
		} catch (e) {
			throw 1;
		} finally {
			require("./used?n=113");
		}

		require("fail");
	}

	function test47() {
		try {
			try {
				return rand();
			} catch (e) {
				return rand();
			} finally {
				require("./used?n=114");
			}
		} catch (e) {
			require("./used?n=115");
		}

		require("./used?n=116");
	}

	function test48() {
		try {
			return rand();
		} catch (e) {
			// nothing
		} finally {
			require("./used?n=117");
		}

		require("./used?n=118");
	}

	function test49() {
		try {
			throw 1;
		} catch (e) {
			// nothing
		} finally {
			require("./used?n=119");
		}

		require("./used?n=120");
	}

	function test50() {
		try {
			try {
				return rand();
			} catch (e) {
				// nothing
			} finally {
				require("./used?n=121");
			}

			require("./used?n=122");
		} catch (e) {
			// nothing
		}

		require("./used?n=123");
	}

	function test51() {
		try {
			try {
				throw 1;
			} catch (e) {
				// nothing
			} finally {
				require("./used?n=124");
			}

			require("./used?n=125");
		} catch (e) {
			// nothing
		}

		require("./used?n=126");
	}

	function test52() {
		try {
			try {
				return rand();
			} finally {
				require("./used?n=127");
			}

			require("fail");
		} catch (e) {
			// nothing
		}

		require("./used?n=137");
	}

	function test53() {
		try {
			try {
				throw 1;
			} finally {
				require("./used?n=128");
			}

			require("fail");
		} catch (e) {
			// nothing
		}

		require("./used?n=136");
	}

	function test54() {
		try {
			try {
				return rand();
			} finally {
				require("./used?n=129");
			}

			require("fail");
		} finally {
			// nothing
		}

		require("fail");
	}

	function test55() {
		try {
			return fn();
		} catch (e) {
			require("./used?n=130");
		} finally {
			require("./used?n=131");
		}

		require("./used?n=132");
	}

	function test56() {
		try {
			fn();
		} catch (e) {
			// nothing
		} finally {
			require("./used?n=133");
			return;
		}

		require("fail");
	}

	function test57() {
		try {
			fn();
		} catch (e) {
			// nothing
		} finally {
			require("./used?n=134");
			throw 1;
		}

		require("fail");
	}

	function test58() {
		try {
			fn();
		} catch (e) {
			// nothing
		}

		require("./used?n=135");
	}

	function test59() {
		try {
			fn();
		} catch (e) {
			try {
				throw 1;
			} catch (e) {
				throw 1;
			} finally {
				require("./used?n=138");
			}
		}

		require("./used?n=139");
	}

	function test60() {
		try {
			try {
				throw 1;
			} catch (e) {
				throw 1;
			} finally {
				require("./used?n=140");
			}
		} catch (e) {
			// nothing
		}

		require("./used?n=141");
	}

	function test61() {
		try {
			return fn();
		} finally {
			require("./used?n=142");
		}

		require("fail");
	}

	function test62() {
		try {
			throw 1;
		} finally {
			require("./used?n=143");
		}

		require("fail");
	}

	function test63() {
		try {
			// nothing
		} finally {
			require("./used?n=145");
		}

		require("./used?n=146");
	}

	function test64() {
		try {
			rand();
		} finally {
			require("./used?n=147");
		}

		require("./used?n=148");
	}

	function test65() {
		try {
			return fn();
		} catch (err) {
			// nothing
		} finally {
			require("./used?n=149");
		}

		require("./used?n=150");
	}

	function test66() {
		try {
			throw 1;
		} catch (err) {
			// nothing
		} finally {
			require("./used?n=151");
		}

		require("./used?n=152");
	}


	for (let i = 0; i < 1; i++)
		if (rand())
			require("./used?n=219");

	for (let i = 0; i < 1; i++) {
		if (true) {
			require("./used?n=222");
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
	} catch {
	}

	require("./used?n=223");
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
			require("./used?n=168");
	}
});

it("should work correct for if", () => {
	if (true) {
		require("./used?n=153");
		return;
	}

	require("fail53");
});

it("should work correct for if #2", () => {
	if (false) {
		require("fail54");
	} else {
		require("./used?n=154");
	}
});

it("should work correct for if #3", () => {
	if (false) {
		require("fail55");
	} else if (true) {
		require("./used?n=155");
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
		require("./used?n=156");
	}
});

it("should work correct for if #5", () => {
	if (rand())
		return;
	else if (rand())
		return;
	else {
		const test = 1;
		require("./used?n=42");
	}
});

it("should work correct for if #6", () => {
	if (rand())
		return;
	else {
		const test = 1;
		require("./used?n=43");
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

	require("./used?n=44");
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
	} else {
	}

	require("./used?n=45");
});

it("should work correct for if #14", () => {
	if (fn())
		return;
	else if (fn()) {
		fn()
		require("./used?n=46");
	}

	require("./used?n=47");
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
	require("./used?n=48");
});

it("should work correct for if #18", () => {
	if (rand()) return;

	const test = 1;
	require("./used?n=49");
});

it("should work correct for if #19", () => {
	if (!rand())
		// if reference flag is false ,then show the form and update the model with relative type list
		return rand();
	else {
		if (rand()) {
			rand();
			require("./used?n=144");
			rand();
		} else {
			rand();
			require("./used?n=58");
			rand();
		}
	}

	require("./used?n=65");
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

	require("./used?n=61");
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

	require("./used?n=239");
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

	require("./used?n=238");
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

	require("./used?n=237");
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
	} else if (rand()) {
	}

	require("./used?n=236");
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

		require("fail");
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
	else if (rand())
		return;
	else
		return;

	require("fail");
});

it("should work correct for if #26", () => {
	if (rand()) {
		return;
	} else if (rand())
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
			require("./used?n=235");
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

	require("./used?n=234");
});

it("should work correct for if #31", () => {
	if (rand()) {
		rand();
	} else {
		rand();
		return;
	}

	require("./used?n=233");
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

	require("./used?n=232");
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

	require("./used?n=231");
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

	require("./used?n=230");
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

	require("./used?n=229");
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

	require("./used?n=228");
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

	require("./used?n=227");
});

it("should work correct for if #39", () => {
	if (rand()) {
		rand();
	} else if (rand()) {
		rand();
	} else {
		return;
		require("fail");
		if (rand()) {
			return;
		} else if (rand()) {
			return;
		} else {
			return;
		}
		require("fail");
	}
});

it("should work correct for if #40", () => {
	if (rand()) {
		require('./used?n=8');
	} else {
		if (rand()) {
			require('./used?n=9');
		} else {
			if (rand()) {
				require('./used?n=10');
			} else {
				if (rand()) {
					require('./used?n=11');
				} else {
					if (rand()) {
						require('./used?n=12');
					} else {
						return;
					}
					require('./used?n=1');
					require('./used?n=2');
				}
				require('./used?n=3');
			}
			require('./used?n=4');
		}
		require('./used?t=5');
	}
	require('./used?n=6');
	require('./used?n=7');
});

it("should work correct for if #41", () => {
	if (rand()) {
		return
	} else {
		if (rand()) {
			return
		} else {
			if (rand()) {
				return
			} else {
				if (rand()) {
					return
				} else {
					if (rand()) {
						return
					} else {
						return;
					}
					require('fail');
					require('fail');
				}
				require('fail');
			}
			require('fail');
		}
		require('fail');
	}
	require('fail');
});

it("should work correct for if #42", () => {
	try {
		if (rand()) {
			return;
			require("fail");
		} else {
			return;
			require("fail");
		}

		require("fail");
		require("fail");
	} catch (e) {
		require('./used?n=13');
	}
});

it("should work correct for if #43", () => {
	for (let i = 0; i < 1; i++) {
		if (true)
			return;
		require("fail");
	}
});

it("should work correct for if #44", () => {
	for (let i = 0; i < 1; i++)
		if (true)
			return;
	require("./used?n=14");
});

it("should work correct for if #45", () => {
	if (rand())
		rand();
	else if (rand())
		rand();
	else
		if (rand())
			return;
		else if (rand())
			return;
		else
			return;

	require("./used?n=68");
});

it("should work correct for if #47", () => {
	if (rand())
		return;
	else if (rand())
		rand();
	else
		return;

	require("./used?n=69");
});

it("should work correct for if #48", () => {
	if (rand())
		return;
	else if (true)
		rand();
	else
		return;

	require("./used?n=70");
});

it("should work correct for if #49", () => {
	if (true)
		return;
	else if (rand())
		rand();
	else
		return;

	require("fail");
});

it("should work correct for if #50", () => {
	if (rand())
		return;
	else if (true)
		return
	else
		return;

	require("fail");
});

it("should work correct for if #51", () => {
	if (rand())
		return;
	else
		return;

	require("fail");
});

it("should work correct for if #52", () => {
	if (true)
		return;
	else
		return;

	require("fail");
});

it("should work correct for if #53", () => {
	if (rand())
		rand();
	else
		return;

	require("./used?n=71");
});

it("should work correct for if #54", () => {
	if (rand()) {
		return rand();
	} else
		return;

	require("fail");
});

it("should work correct for if #55", () => {
	if (rand()) {
		rand();
	} else
		return;

	require("./used?n=72");
});

it("should work correct for if #56", () => {
	if (rand()) {
		return rand();
	} else
		rand();

	require("./used?n=73");
});

it("should work correct for if #57", () => {
	if (rand()) {
		rand();
	} else
		return rand();

	require("./used?n=74");
});

it("should work correct for if #58", () => {
	if (rand()) {
		rand();
	}

	require("./used?n=75");
});

it("should work correct for if #59", () => {
	if (rand()) {
		return rand();
	}

	require("./used?n=76");
});

it("should work correct for if #60", () => {
	if (true) {
		return rand();
	}

	require("fail");
});

it("should work correct for if #61", () => {
	if (false) {
		return rand();
	}

	require("./used?n=77");
});

it("should work correct for if #62", () => {
	if (false) {
		return rand();
	} else {
		rand()
	}

	require("./used?n=78");
});

it("should work correct for if #63", () => {
	if (false) {
		return rand();
	} else {
		return rand()
	}

	require("fail");
});

it("should work correct for switch #1", () => {
	switch (expr) {
		case "Oranges":
			return;
			break;
		case "Apples":
			rand();
			require("./used?n=15");
			break;
		case "Bananas":
		case "Cherries":
			rand()
			require("./used?n=16");
			break;
		case "Mangoes":
		case "Papayas":
			require("./used?n=17");
			break;
		default:
			require("./used?n=18");
	}
});

it("should work correct for switch #2", () => {
	switch (expr) {
		case "Oranges": {
			return;
			break;
		}
		case "Apples": {
			rand();
			require("./used?n=19");
			break;
		}
		case "Bananas":
		case "Cherries": {
			rand()
			require("./used?n=20");
			break;
		}
		case "Mangoes":
		case "Papayas": {
			require("./used?n=21");
			break;
		}
		default: {
			require("./used?n=22");
		}
	}
});

it("should work correct for block statement", () => {
	{
		{
			return;
			require("fail");
		}
		require("fail");
	}

	require("fail");
});

it("should work correct for loop and return", () => {
	function test() {
		for (let i = 0; i < 0; i++)
			if (rand())
				return;
		require("./used?n=23");
	}
});

it("should work correct for labeled statement", () => {
	use_cache: {
		if (rand()) {
			rand();
		} else {
			require("./used?n=27")
		}
		if (rand()) {
			break use_cache;
		}
		if (false) {
			require("fail")
		} else {
			return;
		}
		return entry.result;
	}

	require("./used?n=24")

	{
		require("./used?n=25")
	}

	require("./used?n=26")
});

it("should work correct for while statement", () => {
	let n = 0;
	let x = 0;

	while (false) {
		n++;
		x += n;
		require("./used?n=28");
		return;
	}

	while (false) {
		n++;
		x += n;
		return;
		require("fail");
	}

	while (false) {
		n++;
		x += n;
		throw new Error('test');
		require("fail");
	}

	require("./used?n=29");

	while (false)
		return;

	require("./used?n=30");

	while (require("./used?n=241") < 5) {
		return;
	}

	require("./used?n=242");

	while (
		(() => {
			return 15;
		})() < 10
		) {
		return;
	}

	require("./used?n=243");

	while (
		(function wrap() {
			return 15;
		})() < 10
		) {
		return;
	}

	require("./used?n=244");
});

it("should work correct for do while statement", () => {
	let n = 0;
	let x = 0;

	do {
		n++;
		x += n;
		require("./used?n=31");
		return;
	} while(false)

	do {
		n++;
		x += n;
		return;
		require("fail");
	} while(false);

	do {
		n++;
		x += n;
		throw new Error('test');
		require("fail");
	} while(false)

	require("./used?n=32");

	do
	return;
	while(false)

	require("./used?n=33");
});

it("should work correct for for/in", () => {
	const object = { a: 1, b: 2, c: 3 };

	for (const property in object) {
		return;
	}

	try {
		for (const property in object) {
			return;
			require("fail")
		}
	} catch (e) {

	} finally {

	}

	try {
		for (const property in object) {
			throw new Error('test');
			require("fail")
		}
	} catch (e) {
		require("./used?n=66");
	} finally {
		require("./used?n=67");
	}

	require("./used?n=34");

	for (const property in object)
		return;

	require("./used?n=35");
});

it("should work correct for for/of", () => {
	const iterable = [10, 20, 30];

	for (let value of iterable) {
		return;
	}

	require("./used?n=36");

	for (let value of iterable)
		return;

	require("./used?n=37");
});

it("should work correct for for", () => {
	for (let i = 0; i < 9; i++) {
		return;
	}

	require("./used?n=38");

	for (let i = 0; i < 9; i++)
		return;

	require("./used?n=39");
});

it("should work correct for function declaration", () => {
	require("./used?n=40");

	function test() {
		return;
	}

	require("./used?n=50");
});

it("should work correct for IIFE", () => {
	require("./used?n=51");

	(function () {
		return;
	})();

	require("./used?n=52");

	(() => {
		return;
	})();

	require("./used?n=53");

	(async () => {
		return;
	})();

	require("./used?n=54");
});

it("should work correct for classes", () => {
	require("./used?n=55");

	class Test {
		fn() {
			return;
		}
	}

	require("./used?n=56");
});

it("should not include unused assets", (done) => {
	let a, b;
	(function () {
		try {
			return;

			require("fail59");
		} finally {
			a = require("./used?n=157");

			{
				try {
					return fn();
					require("fail60");
				} finally {
					b = require("./used?n=158");
				}
			}

			require("./used49");
		}
	})();
});

it("should work correct for classes", () => {
	class Test {
		value = true ? require("./used?n=159") : require("fail62");

		static value = true ? require("./used?n=160") : require("fail63");

		constructor(height = true ? require("./used?n=161") : require("fail64"), width) {
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
	require("./used?n=162");
} else {
	require("fail72");
}

const test = true ? require("./used?n=163") : require("fail73");

const a = rand() ? 1 : 2;

switch (a) {
	case 1: {
		if (true) require("./used?n=225");
		else require("fail74");
	}
	case 2:
		if (false) require("fail75");
	default:
		require("./used?n=169");
}

if (true) {
	require("./used?n=224");
}

if (false) {
	require("fail77");
}

require("./used?n=226");
