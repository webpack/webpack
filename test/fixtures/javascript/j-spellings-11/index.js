function f(a, q) {
	switch (a) {
		default: {
			console.log(1);
			break;
		}
		case 1: {
			console.log(2);
			break;
		}
	}
	switch (q) {
		case 2: {
			let y = a + 1;
			console.log(y, y);
			break;
		}
	}
}
f(1, 2);
f(0, 0);
