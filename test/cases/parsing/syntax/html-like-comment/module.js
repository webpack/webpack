let count = 2;
// a module reads `<!--` as `<`, `!` and `--`, never as a comment
export const less = 1 <!--count + 1;
export const text = 1 <!--count + `
`;
export const left = () => count;
