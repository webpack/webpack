function loop(a) {
	for (var i = 0; i < 2; i++)
		switch (a) {
			case 1:
		}
	var j = 0;
	while (j++ < 2)
		switch (a) {
			case 1:
			case 2:
				break;
		}
	do
		switch (a) {
			default:
		}
	while (j++ < 4);
	return [i, j];
}
console.log(loop(1), loop(2));
function branch(a, b) {
	if (b)
		switch (a) {
			case 1:
		}
	else console.log("else");
	if (!b) console.log("then");
	else
		switch (a) {
		}
}
branch(1, 0);
branch(1, 1);
function kept(o) {
	for (var i = 0; i < 1; i++)
		switch (o.x) {
			case 1:
		}
}
kept({
	get x() {
		console.log("get");
		return 1;
	}
});
