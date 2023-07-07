import { Dispatch } from 'react/src/currentDispatcher';
import type { Action } from 'shared/ReactTypes';

export interface Update<State> {
	action: Action<State>;
}

export interface UpdateQueue<State> {
	shared: {
		pedding: Update<State> | null;
	};
	dispatch: Dispatch<State> | null;
}

export function createUpdate<State>(action: Action<State>): Update<State> {
	return { action };
}

export function createUpdateQueue<State>(): UpdateQueue<Action<State>> {
	return {
		shared: {
			pedding: null
		},
		dispatch: null
	};
}

export function enqueueUpdate<State>(
	updateQueue: UpdateQueue<State>,
	update: Update<State>
) {
	updateQueue.shared.pedding = update;
}

// 消费updateQueue-对应setState(state)/setState(prevState => State )
export function processUpdateQueue<State>(
	baseState: State,
	peddingUpdate: Update<State> | null
): { memoizedState: State | null } {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoizedState: baseState
	};

	if (peddingUpdate !== null) {
		const action = peddingUpdate.action;
		if (action instanceof Function) {
			result.memoizedState = action(baseState);
		} else {
			result.memoizedState = action;
		}
	}

	return result;
}
