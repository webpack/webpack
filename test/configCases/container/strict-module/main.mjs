import "containerA/ComponentA";
import React, { setVersion } from "react";

export function get() {
	return { React, setVersion };
}
