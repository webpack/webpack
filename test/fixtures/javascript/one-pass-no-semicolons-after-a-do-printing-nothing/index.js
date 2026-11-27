[5, 6].forEach(function (n) {
	var b = n + 1;
	do {
		break;
	} while (b);
	[b, n].forEach(function (v) {
		console.log(v);
	});
});
