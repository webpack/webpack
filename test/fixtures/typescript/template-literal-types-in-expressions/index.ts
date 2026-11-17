const value = `outer ${inner as string} text`;
const typed = tag<`a${string}`>`template`;
let annotated: `x-${number}` = `x-${1}`;
