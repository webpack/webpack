function f(y, z) {
	switch (y) {
		case 3:
			console.log(1);
			console.log(2);
	}
	switch (z) {
		case 4:
			console.log(3);
			console.log(4);
			break;
		default:
			console.log(5);
			console.log(6);
	}
}
f(3, 4);
f(0, 0);
