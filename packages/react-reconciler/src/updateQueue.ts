import type { Action } from 'shared/ReactTypes';

export interface Update<State> {
	action: Action<State>;
}

export interface UpdateQueue<Action> {
	shared: {
		pedding: Update<Action> | null;
	};
}

export function createUpdate<State>(action: Action<State>): Update<State> {
	return { action };
}

export function createUpdateQueue<Action>(): UpdateQueue<Action> {
	return {
		shared: {
			pedding: null
		}
	};
}

export function enqueueUpdate<State>(
	updateQueue: UpdateQueue<Action<State>>,
	update: Update<Action<State>>
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
