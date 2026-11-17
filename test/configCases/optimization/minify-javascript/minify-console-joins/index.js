var log = [];

function note(value) {
	log.push(value);
	return value;
}

function chained() {
	console.a.b.c(note("dropped"));
	console?.log(note("optional"));
	return log.length;
}

function message(size) {
	return [`<Grid size={${size}} />`, `Below ${size + 1}.`, "", "End."].join(
		"\n"
	);
}

function closing(x) {
	return `a<` + `/script>${x}`;
}

function comment(x) {
	return `a<!` + `-- ${x}`;
}

it("should drop console chains and join templates as their values", () => {
	expect(chained()).toBe(0);
	expect(message(3)).toBe("<Grid size={3} />\nBelow 4.\n\nEnd.");
	expect(closing(1)).toBe("a</script>1");
	expect(comment(1)).toBe("a<!-- 1");
});
