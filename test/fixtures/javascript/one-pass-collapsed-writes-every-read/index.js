// Each write of a name folds into its one read; with every read taking such a
// value, the writes go, and where another read is left they stay.
var log = [];
function parse(n) {
	return n % 2;
}
function walk(count) {
	var type;
	var i = count;
	while (i > 0) {
		type = parse(i);
		switch (type) {
			case 1:
				log.push("odd");
		}
		i--;
	}
	while (i < count) {
		type = parse(i);
		switch (type) {
			case 0:
				log.push("even");
		}
		i++;
	}
}
function kept(count) {
	var type;
	var i = count;
	while (i > 0) {
		type = parse(i);
		switch (type) {
			case 1:
				log.push("odd");
		}
		i--;
	}
	return type;
}
walk(3);
log.push(kept(2));
console.log(log.join());
