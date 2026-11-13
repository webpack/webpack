export default function pick(log) {
	var known = 1;
	if (known) log.push("kept");
	else log.push("never");
	return log;
}
