function outer(x) {
	function inner() {
		L: {
			console.log("PASS", x);
			break L;
		}
	}
	inner();
}
outer(0);
function loop() {
	L: for (var i = 0; i < 3; i++) {
		if (i === 1) continue L;
		console.log("i", i);
	}
}
loop();
