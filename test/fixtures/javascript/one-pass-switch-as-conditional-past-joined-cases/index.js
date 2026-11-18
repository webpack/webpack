function joined(definitelyTrue, maybeTrue) {
	switch (true) {
		case maybeTrue:
			console.log("maybe");
			break;
		case definitelyTrue:
		default:
			console.log("definitely");
			break;
	}
}
function unlabeled(definitelyTrue, maybeTrue) {
	switch (true) {
		case maybeTrue:
			console.log("maybe");
			break;
		default:
		case definitelyTrue:
			console.log("definitely");
			break;
	}
}
function written(value, other) {
	other = value > 1;
	switch (value) {
		case other:
			console.log("same");
			break;
		default:
			console.log("differs", value);
	}
}
function runsNothing(value) {
	switch (value) {
		default:
		case console.log("tested", value):
		case 2:
	}
}
function order(read) {
	switch (1) {
		case read():
			console.log(111);
			break;
		case 1:
			console.log(222);
			break;
		case 2:
			console.log(333);
	}
}
joined(true, false);
joined(true, true);
unlabeled(true, false);
unlabeled(true, true);
written(2);
written(true);
runsNothing(1);
runsNothing(2);
order(function () {
	return 1;
});
order(function () {
	return 2;
});
