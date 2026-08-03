let count = 0;

function track(value) {
	count++;
	return value;
}

/*#__NO_SIDE_EFFECTS__*/
function trackAnnotated(value) {
	count++;
	return value;
}

module.exports = {
	used: "used",
	unusedPure: /*#__PURE__*/ track("unused-pure"),
	unusedAnnotated: trackAnnotated("unused-annotated"),
	unusedLiteral: track,
	getCount() {
		return count;
	}
};
