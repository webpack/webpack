function loading(props) {
	if (props.pastDelay) return null;
	if (false) {
	}
	return null;
}
console.log(loading({ pastDelay: true }), loading({}));
function chained(props) {
	if (props.error) return "error";
	if (0);
	;
	if (props.timedOut) return "timed out";
	return "loading";
}
console.log(chained({ error: 1 }), chained({ timedOut: 1 }), chained({}));
function thrown(props) {
	if (props.error) throw "error";
	if (1) {
	}
	throw "other";
}
try {
	thrown({});
} catch (error) {
	console.log(error);
}
function kept(props) {
	if (props.error) return "error";
	if (props.read) {
	}
	return "kept";
}
console.log(kept({ read: 1 }));
function commented(props) {
	if (props.error) return "error";
	if (0) {
		// a comment keeps it
	}
	return "commented";
}
console.log(commented({}));
function last(props) {
	if (props.error) return "error";
	if (0) {
	}
}
console.log(last({}));
