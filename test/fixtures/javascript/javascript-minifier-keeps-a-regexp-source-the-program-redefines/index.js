Object.defineProperty(RegExp.prototype, "source", { value: "changed" });
console.log(/x/.source, { a: /y/ }.a.source);
