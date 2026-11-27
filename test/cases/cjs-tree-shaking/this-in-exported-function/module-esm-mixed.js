export const z = 1;

Object.defineProperty(exports, "receiver", {
	value: function receiver() {
		return this;
	}
});

Object.defineProperty(exports, "deadBranch", {
	value: function deadBranch() {
		if (false) {
			this;
		}
		// prettier-ignore
		/1;globalThis.thisInDeadBranchRan=true;1/g;
		return 1;
	}
});
