var count = 0;
function twice() {
	outer: inner: for (;;) {
		if (count++ > 3) break outer;
		console.log(count);
	}
}
function thrice() {
	first: second: third: while (true) {
		if (count++ > 6) break first;
		console.log(count);
	}
}
function kept() {
	kept: for (;;) {
		for (;;) {
			if (count++ > 9) break kept;
			console.log(count);
			break;
		}
	}
}
twice();
thrice();
kept();
console.log("end", count);
