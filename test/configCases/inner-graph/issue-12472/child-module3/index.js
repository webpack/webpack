export const childFn = () => 2;

// preventing sideEffect=false detection
[String, Array].forEach((obj, index) =>
	obj[["prototype", "prototype"][index]].constructor()
);
