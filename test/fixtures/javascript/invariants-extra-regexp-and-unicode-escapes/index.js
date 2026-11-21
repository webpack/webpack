const re = /^(?<word>\p{Letter}+)-(?<id>\d{2,4})$/u;
const matches = re.exec("alpha-1234");

const tpl = String.raw`\u{1F680}\n${matches?.groups?.word ?? "x"}`;
const hex = "\x41\u0042\u{43}";

export { hex, matches, tpl };
