const url = API("./getText.js", "getText");

const res = await fetch(url);
export default await res.text();
