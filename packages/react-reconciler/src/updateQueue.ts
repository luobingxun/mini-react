import { Dispatch } from 'react/src/currentDispatcher';
import type { Action } from 'shared/ReactTypes';
import { Lane } from './fiberLane';

export interface Update<State> {
	action: Action<State>;
	next: Update<State> | null;
	lane: Lane;
}

export interface UpdateQueue<State> {
	shared: {
		pedding: Update<State> | null;
	};
	dispatch: Dispatch<State> | null;
}

export function createUpdate<State>(
	action: Action<State>,
	lane: Lane
): Update<State> {
	return { action, next: null, lane };
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
	const pedding = updateQueue.shared.pedding;
	if (pedding === null) {
		update.next = update;
	} else {
		update.next = pedding.next;
		pedding.next = update;
	}
	updateQueue.shared.pedding = update;
}

// 消费updateQueue-对应setState(state)/setState(prevState => State )
export function processUpdateQueue<State>(
	baseState: State,
	peddingUpdate: Update<State> | null,
	renderLane: Lane
): { memoizedState: State | null } {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoizedState: baseState
	};

	if (peddingUpdate !== null) {
		const first = peddingUpdate.next;
		let pedding = peddingUpdate.next as Update<any>;
		do {
			const updateLane = pedding.lane;
			if (updateLane === renderLane) {
				const action = pedding.action;
				if (action instanceof Function) {
					baseState = action(baseState);
				} else {
					baseState = action;
				}
			}
			pedding = pedding.next as Update<any>;
		} while (pedding !== first);
	}

	result.memoizedState = baseState;
	return result;
}
