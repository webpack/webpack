import test from "./module";
import url from "./file.png";
console.log(test, url, new URL("file.jpg?query", import.meta.url));
