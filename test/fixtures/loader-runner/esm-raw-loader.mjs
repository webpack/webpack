export default function (source) {
	return Buffer.from(
		source.toString("hex") + source.toString("utf-8"),
		"utf-8"
	);
}

export const raw = true;
