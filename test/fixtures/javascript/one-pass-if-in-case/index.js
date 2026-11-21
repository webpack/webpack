function pick(k) {
	switch (k) {
		case 1:
			if (1) console.log("one");
			else console.log("never");
			break;
		case 2:
			if (0) console.log("never");
			console.log("two");
			break;
		default:
			if ("") {
				var hidden = 1;
			}
			console.log(hidden);
	}
}
pick(1);
pick(2);
pick(3);
