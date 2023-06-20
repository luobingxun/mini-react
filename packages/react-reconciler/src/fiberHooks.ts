import type { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import { FiberNode } from './fiber';
import {
	UpdateQueue,
	createUpdate,
	createUpdateQueue,
	enqueueUpdate
} from './updateQueue';
import internals from 'shared/internals';
import { Action } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';

const { currentDispatcher } = internals;

interface Hook {
	memmoizedState: unknown;
	updateQueue: UpdateQueue<unknown> | null;
	next: Hook | null;
}

let currentlyRenderingFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null;

export function renderWithHooks(workInProgress: FiberNode) {
	currentlyRenderingFiber = workInProgress;
	const current = workInProgress.alternate;

	if (current !== null) {
		// update
	} else {
		currentDispatcher.current = HooksDispatcherOnMount;
	}

	const props = workInProgress.peddingProps;
	const Component = workInProgress.type;
	const children = Component(props);
	// 重置
	currentlyRenderingFiber = null;
	return children;
}

const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState
};

function mountState<T>(initialState: T | (() => T)): [T, Dispatch<T>] {
	const hook = mountWorkInProgressHook();
	let memoizedState;
	if (initialState instanceof Function) {
		memoizedState = initialState();
	} else {
		memoizedState = initialState;
	}
	hook.memmoizedState = memoizedState;
	const queue = createUpdateQueue();
	hook.updateQueue = queue;

	// currentlyRenderingFiber已经绑定在setState中，因此可以在其他组件中使用setState(脱离当前组件使用)
	// @ts-ignore
	const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
	queue.dispatch = dispatch;
	return [memoizedState, dispatch];
}

function dispatchSetState<T>(
	currentlyRenderingFiber: FiberNode,
	queue: UpdateQueue<T>,
	action: Action<T>
) {
	const update = createUpdate(action);
	enqueueUpdate(queue, update);
	scheduleUpdateOnFiber(currentlyRenderingFiber);
}

function mountWorkInProgressHook() {
	const hook: Hook = {
		memmoizedState: null,
		updateQueue: null,
		next: null
	};

	if (workInProgressHook === null) {
		if (currentlyRenderingFiber === null) {
			throw new Error('hook 只能在函数组件使用');
		} else {
			currentlyRenderingFiber.memoizedState = hook;
			workInProgressHook = hook;
		}
	} else {
		workInProgressHook.next = hook;
		workInProgressHook = hook;
	}

	return workInProgressHook;
}
