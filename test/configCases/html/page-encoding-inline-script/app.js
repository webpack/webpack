// "★", "☆" and "𝑥" are no characters of windows-1252
const tag = (strings, ...values) => strings;
const site = () => tag`★${1}☆`;
var 𝑥 = 2;

window.__results = {
	raw: String.raw`a★\n${𝑥}☆`,
	cooked: [...site()],
	rawStrings: [...site().raw],
	sameSite: site() === site(),
	frozen: Object.isFrozen(site()) && Object.isFrozen(site().raw),
	nested: String.raw`<${String.raw`★`}>`,
	member: { tag: String.raw }.tag`m★`,
	identity: "\★",
	continued: "a\ b",
	astral: 𝑥
};
