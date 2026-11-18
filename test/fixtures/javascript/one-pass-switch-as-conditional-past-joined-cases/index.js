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
joined(true, false);
joined(true, true);
unlabeled(true, false);
unlabeled(true, true);
written(2);
written(true);
