// content
var test = [1,2,3,4,5,6,7,8,9,10];
for(var i = 0; i < test.length; i++) {
	console.log(test[i]);
	if(process.env.manyFiles === "files") {
		console.log(test[i]);
	}

	if(process.env.manyFiles === "test") {
		console.log(test);
	}
}
