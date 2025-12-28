console.log(new URL("./subdir/", import.meta.url).href);
console.log(new URL("./", import.meta.url).href);
console.log(new URL(".", import.meta.url).href);
console.log(new URL("..", import.meta.url).href);
