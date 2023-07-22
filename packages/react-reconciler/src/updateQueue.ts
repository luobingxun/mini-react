import { Dispatch } from 'react/src/currentDispatcher';
import type { Action } from 'shared/ReactTypes';
import { Lane, isSubsetOfLanes } from './fiberLane';

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
): { memoizedState: State; baseState: State; baseQueue: Update<State> | null } {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoizedState: baseState,
		baseQueue: peddingUpdate,
		baseState: baseState
	};

	let newBaseState = baseState;
	let newBaseQueueFirst: Update<any> | null = null;
	let newBaseQueueLast: Update<any> | null = null;
	let newState = baseState;

	if (peddingUpdate !== null) {
		const first = peddingUpdate.next;
		let pedding = peddingUpdate.next as Update<any>;
		do {
			const updateLane = pedding.lane;
			if (!isSubsetOfLanes(renderLane, updateLane)) {
				const clone = createUpdate(pedding.action, pedding.lane);

				// 第一次被跳过
				if (newBaseQueueFirst === null) {
					newBaseQueueFirst = clone;
					newBaseQueueLast = clone;
					newBaseState = newState;
				} else {
					(newBaseQueueLast as Update<any>).next = clone;
					newBaseQueueLast = clone;
				}
			} else {
				// 已经有跳过的update, 需要将参与计算的update加入到baseQueue
				if (newBaseQueueLast !== null) {
					const clone = createUpdate(pedding.action, pedding.lane);
					(newBaseQueueLast as Update<any>).next = clone;
					newBaseQueueLast = clone;
				}
				const action = pedding.action;
				if (action instanceof Function) {
					newState = action(baseState);
				} else {
					newState = action;
				}
			}

			pedding = pedding.next as Update<any>;
		} while (pedding !== first);

		// 整个过程没有被跳过的update则baseState于memoizedState一致
		if (newBaseQueueLast === null) {
			newBaseState = newState;
		} else {
			newBaseQueueLast.next = newBaseQueueFirst;
		}

		result.memoizedState = newState;
		result.baseQueue = newBaseQueueFirst;
		result.baseState = newBaseState;
	}

	return result;
}
