export const literal = "literal";

const local = "local";
export { local as renamed };

const source = { destructured: "destructured" };
export const { destructured } = source;

export const [arrayValue] = ["array"];

const aliased = "aliased";
export { aliased as "string-alias" };
