// The declarations and expressions a `switch` case lists join as a block's do.
function run(code) {
	switch (code) {
		case 1:
			let apple = code + 1;
			let dog = code + 4;
			console.log(apple, dog);
			break;
		case 2:
			console.log("two");
			console.log("still two");
			break;
		case 3:
			var x = String(code);
			var y = x + "!";
			console.log(x, y);
		default:
			const cat = code + 3;
			const bird = cat * 2;
			console.log(cat, bird);
			console.log("default");
	}
}
run(1);
run(2);
run(3);
run(4);
