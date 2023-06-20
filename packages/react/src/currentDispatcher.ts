import { Action } from 'shared/ReactTypes';

export type Dispatch<State> = (action: Action<State>) => void;

export interface Dispatcher {
	useState: <T>(initialState: T | (() => T)) => [T, Dispatch<T>];
}

export const currentDispatcher: {
	current: Dispatcher | null;
} = {
	current: null
};

export function resolveDispatcher() {
	const dispatcher = currentDispatcher.current;

	if (dispatcher === null) {
		throw new Error('Hooks 只能在函数组件中使用');
	}

	return dispatcher;
}
