export type WorkerResult = string;
export const compute = (input: string): WorkerResult => `processed-${input}`;
