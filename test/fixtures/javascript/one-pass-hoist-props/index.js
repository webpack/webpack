// A constant object read at known keys from a function it holds folds there.
!function () {
	var options = { key: "some string" };
	var read = function () {
		return options.key;
	};
	console.log(read(), read());
}();
!function () {
	var flags = { a: 1 };
	console.log(
		(function () {
			if (flags.a) return "PASS";
		})()
	);
}();
// Nested literals fold where the read ends at a value.
!function () {
	var table = [4, [{ a: -1, b: 5 }]];
	var other = [4, [{ a: -10, b: 5 }]];
	var unused = { first: table, second: other };
	console.log(table[1][0].a, other[1][0].a);
}();
!function () {
	var settings = { size: { width: 2, height: 3 } };
	console.log(settings.size.width * settings.size.height);
}();
// A read that runs nothing but the fold goes with its statement.
!function () {
	var constants = { first: 1, second: 2 };
	constants.second;
	console.log(constants.first);
}();
// Read before it is set, by a call before the declaration, it stays.
!function () {
	function early() {
		return box.value;
	}
	console.log(typeof early === "function" ? "PASS" : "FAIL");
	try {
		early();
	} catch (error) {
		console.log(error instanceof TypeError);
	}
	var box = { value: "late" };
	console.log(early());
}();
// The literal escapes, is written or deleted: every read keeps it.
!function () {
	var shared = { inner: { value: 1 } };
	var escaped = [shared.inner];
	escaped[0].value = 2;
	console.log(shared.inner.value);
}();
!function () {
	var written = { inner: { value: 1 } };
	written.inner.value++;
	console.log(written.inner.value);
}();
!function () {
	var removed = { inner: { value: 1 } };
	delete removed.inner.value;
	console.log(removed.inner.value);
}();
// A key the literal lacks reads the prototype chain, which may change.
!function () {
	var plain = { a: { b: 1 } };
	Object.prototype.c = "from prototype";
	console.log(plain.a.c, plain.a.b);
	delete Object.prototype.c;
}();
// A negative value folds only where a `-` needs no space or parentheses.
!function () {
	var signs = [-1, 2];
	var x = 3;
	console.log(x - signs[0], signs[0] ** 2 === 1 ? "PASS" : "FAIL", signs[1]);
}();
!function () {
	var negatives = [-1, -2];
	console.log(negatives[0], [negatives[1]]);
}();
// Tested where it is read, a nested read keeps the literal past its drop.
!function () {
	var tested = [1, 2];
	var gone = { list: tested };
	if (tested[0]) console.log("PASS");
	console.log(tested[1]);
}();
