import a from "a";

System.import("b").then(function(b) {
	console.log("b loaded", b);
})

function loadC(name) {
	return System.import("c/" + name)
}

Promise.all([loadC("1"), loadC("2")]).then(function(arr) {
	console.log("c/1 and c/2 loaded", arr);
});
