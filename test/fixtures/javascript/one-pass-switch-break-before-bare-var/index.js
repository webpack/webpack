var a = 100,
	b = 10;
switch (b) {
	case a--:
		break;
	case b:
		var c;
		break;
	case a:
		break;
	case a--:
		break;
}
console.log(a, b, c);

function pick(x) {
	var log = [];
	switch (x) {
		case 1:
			log.push("one");
			break;
		case (log.push("test"), 2):
			var d, e;
		case 3:
			var f;
			break;
		case 4:
			log.push("four");
	}
	console.log(x, log.join(), d, e, f);
}
pick(1);
pick(2);
pick(3);
pick(4);

function kept(x) {
	var log = [];
	switch (x) {
		case 1:
			log.push("one");
			break;
		case 2:
			var g = 1;
	}
	console.log(x, log.join(), g);
}
kept(1);
kept(2);

for (var i = 0; i < 3; i++) {
	switch (i) {
		case 0:
			console.log("zero");
			break;
		case 1:
			var v;
	}
	console.log(i, v);
}
