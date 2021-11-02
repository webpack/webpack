type Accept = (
	module: string|string[],
	callback?: () => void,
	errorHandler?: (err: Error, ids: {moduleId: string | number, dependencyId: string | number}) => void
) => void;
type SelfAccept = (
	errorHandler: (err: Error, ids: {moduleId: string | number, module: any}) => void
) => void;

interface ApplyInfo {
	type: 'self-declined' | 'declined' |
		'unaccepted' | 'accepted' |
		'disposed' | 'accept-errored' |
		'self-accept-errored' | 'self-accept-error-handler-errored';
	moduleId: number; // The module in question.
	dependencyId: number; // For errors: the module id owning the accept handler.
	chain: number[]; // For declined/accepted/unaccepted: the chain from where the update was propagated.
	parentId: number; // For declined: the module id of the declining parent
	outdatedModules: number[]; // For accepted: the modules that are outdated and will be disposed
	outdatedDependencies: {
		[id: number]: number[]
	};
	error: Error; // For errors: the thrown error
	originalError: Error; // For self-accept-error-handler-errored:
	// the error thrown by the module before the error handler tried to handle it.
}

interface ApplyOptions {
	ignoreUnaccepted?: boolean;
	ignoreDeclined?: boolean;
	ignoreErrored?: boolean;
	onDeclined?(callback: (info: ApplyInfo) => void): void;
	onUnaccepted?(callback: (info: ApplyInfo) => void): void;
	onAccepted?(callback: (info: ApplyInfo) => void): void;
	onDisposed?(callback: (info: ApplyInfo) => void): void;
	onErrored?(callback: (info: ApplyInfo) => void): void;
}

enum HotUpdateStatus {
	idle = "idle",
	check = "check",
	prepare = "prepare",
	ready = "ready",
	dispose = "dispose",
	apply = "apply",
	abort = "abort",
	fail = "fail"
}

export interface Hot {
	accept: Accept & SelfAccept;
	status(): HotUpdateStatus;
	decline(module?: string|string[]): void;
	dispose(callback: (data: any) => void);
	invalidate(): void;
	addStatusHandler(callback: (status: HotUpdateStatus) => void);
	removeStatusHandler(callback: () => void): void;
	data: any;
	check(autoApply: boolean | any): Promise<any[]>;
	apply(options?: ApplyOptions): Promise<any[]>;
}
