function run(y) {
	L: switch (0) {
		default:
		case y:
			break L;
	}
	M: {
		N: switch (1) {
			case y:
				break N;
		}
		break M;
	}
	console.log("run", y);
	return y + 1;
}
console.log(run(0), run(1));
