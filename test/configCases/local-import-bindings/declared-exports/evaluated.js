export function viaEval() {
	return "before";
}

// A direct eval can write any binding of the scope it runs in.
eval("viaEval = () => 'after'");
