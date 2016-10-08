declare module "isopod" {
	export function serialize<T>(root: T): string;
	export function deserialize<T>(serialized: string): T;
}
