export type Type = any;
export type Key = any;
export type Props = any;
export type Ref<T = any> = ((instance: T) => void) | { current: T | null };

export interface ReactElementType {
	$$typeof: symbol | number;
	type: Type;
	key: Key;
	props: Props;
	ref: Ref;
	__mark: string;
}

export type Action<State> = State | ((prevState: State) => State);
