/* eslint-disable no-eval */
// prettier-ignore
export let current
/1;global.liveAsiEvalRegExpRan=true;1/g

// prettier-ignore
export let handler = () => {}
[0]

export function set(value) {
	eval("current = value; handler = value");
}
