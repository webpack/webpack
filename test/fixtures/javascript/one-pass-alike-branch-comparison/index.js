function compare(value, test, other) {
	console.log(
		value === (test ? value : value),
		value !== (test ? value : value),
		(test ? value : value) === value,
		value === (test ? value : other),
		value !== (test ? value : other)
	);
}
compare(0, 0, 0);
compare(0, true, 0);
compare(1, null, "1");
compare(NaN);
compare(NaN, "test");
