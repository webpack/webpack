const mode = "production";
function picked() {
	for (const item of [1]) console.log(item);
	switch (mode) {
		case "production":
			console.log("production");
			return "expected";
		default:
			return "other";
	}
	console.log("never");
	return "unexpected";
}
function broken() {
	switch (mode) {
		case "production":
			console.log("broken");
			break;
	}
	return "after";
}
function hoisting() {
	switch (mode) {
		case "production":
			return later;
	}
	var later;
}
function labeled(flag) {
	label: switch (mode) {
		case "production":
			if (flag) break label;
			return "labeled";
	}
	return "rest";
}
console.log(picked(), broken(), hoisting(), labeled(1), labeled(0));
