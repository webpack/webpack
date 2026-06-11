let innerDecl = 40;
innerDecl++;

function MyLib(x) {
	return x + 1;
}

export function getValue() {
	return innerDecl + MyLib(0);
}
