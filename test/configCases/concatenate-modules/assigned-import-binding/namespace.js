import * as counter from "./counter";

export function writeMember() {
	counter.count = 7;
}

export function updateMember() {
	counter.count++;
}

export function updateMemberPrefix() {
	++counter.count;
}
