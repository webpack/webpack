"use strict";

export default function* idMaker(){
	var index = 0;
	while(true)
		yield index++;
}
