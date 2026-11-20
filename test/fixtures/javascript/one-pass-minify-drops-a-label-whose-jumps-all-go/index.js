var log = [];
function dead(x) {
	a: {
		if (false) break a;
		log.push("dead", x);
	}
}
function last(x) {
	out: switch (x) {
		case 1:
			log.push("last", x);
			break out;
	}
}
function prefixed(x) {
	a: {
		ab: for (;;) {
			for (;;) {
				if (x) break ab;
				log.push("prefixed");
				x = 1;
			}
		}
		if (false) break a;
		log.push("after", x);
	}
}
function quoted(x) {
	a: {
		log.push("break a");
		if (false) break a;
		log.push("quoted", x);
	}
}
function commented(x) {
	a: {
		/*! kept */
		if (false) break a;
		log.push("commented", x);
	}
}
function kept(x) {
	a: {
		if (x) break a;
		log.push("kept", x);
	}
}
dead(1);
last(1);
prefixed(0);
quoted(1);
commented(1);
kept(0);
console.log(log.join());
