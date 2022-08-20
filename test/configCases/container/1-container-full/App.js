import React from "react";
import ComponentA from "containerA/ComponentA";
import ComponentB from "containerB/ComponentB";
import LocalComponentB from "./ComponentB";

export default () => {
	return `App rendered with [${React()}] and [${ComponentA()}] and [${ComponentB()}]`;
};

expect(ComponentB).not.toBe(LocalComponentB);
