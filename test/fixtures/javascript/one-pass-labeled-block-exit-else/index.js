function run(flag) {
	done: {
		if (flag) {
			console.log("first", flag);
			break done;
		}
		console.log("second", flag);
	}
	console.log("after", flag);
}
run(0);
run(1);
function nested(flag) {
	outer: {
		inner: {
			if (flag) {
				console.log("inner", flag);
				break outer;
			}
			console.log("rest", flag);
		}
		console.log("outer rest", flag);
	}
}
nested(0);
nested(1);
