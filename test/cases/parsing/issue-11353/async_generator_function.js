"use strict";

export default async function* asyncIdMaker(start = 1, end = 5){
	for (let i = start; i <= end; i++) {

		// yay, can use await!
		await new Promise(resolve => setTimeout(resolve, 1000));

		yield i;
	}
}
