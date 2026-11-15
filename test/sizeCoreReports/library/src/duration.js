const UNITS = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 };

export function parseDuration(value) {
	if (typeof value === "number") return value;
	let total = 0;
	for (const [, amount, unit] of String(value).matchAll(/(\d+(?:\.\d+)?)(ms|s|m|h|d)/g)) {
		total += Number(amount) * UNITS[unit];
	}
	return total;
}

export function formatDuration(milliseconds) {
	const parts = [];
	let rest = Math.max(0, Math.round(milliseconds));
	for (const unit of ["d", "h", "m", "s"]) {
		const amount = Math.floor(rest / UNITS[unit]);
		if (amount > 0) parts.push(`${amount}${unit}`);
		rest -= amount * UNITS[unit];
	}
	if (rest > 0 || parts.length === 0) parts.push(`${rest}ms`);
	return parts.join(" ");
}
