import type { Request, Response } from "express";
import { Router } from "express";

export interface User {
	id: number;
	name: string;
	email?: string;
}

type Handler<T = unknown> = (req: Request, res: Response) => Promise<T>;

const users: Map<number, User> = new Map();

export class UserService<TUser extends User = User> {
	private readonly cache = new Map<number, TUser>();
	protected static instances = 0;

	constructor(private_?: string) {
		UserService.instances++;
	}

	async find(id: number): Promise<TUser | undefined> {
		return this.cache.get(id) ?? (users.get(id) as TUser | undefined);
	}

	save(user: TUser): void;
	save(user: TUser, overwrite: boolean): void;
	save(user: TUser, overwrite = false): void {
		if (overwrite || !this.cache.has(user.id)) this.cache.set(user.id, user);
	}
}

export const handler: Handler<void> = async (req, res) => {
	const id = Number(req.params!.id);
	const user = await new UserService().find(id);
	res.json(user satisfies User | undefined);
};

export function route(router: Router = Router()): Router {
	router.get("/users/:id", (req: Request, res: Response): void => {
		void handler(req, res);
	});
	return router;
}
