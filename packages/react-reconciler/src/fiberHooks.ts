import { FiberNode } from './fiber';
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	processUpdateQueue
} from './updateQueue';
import internals from 'shared/internals';
import { scheduleUpdateOnFiber } from './workLoop';
import type { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import { type Update, type UpdateQueue } from './updateQueue';
import type { Action } from 'shared/ReactTypes';

const { currentDispatcher } = internals;

interface Hook {
	memmoizedState: any;
	updateQueue: UpdateQueue<any> | null;
	next: Hook | null;
}

let currentlyRenderingFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null;

export function renderWithHooks(workInProgress: FiberNode) {
	currentlyRenderingFiber = workInProgress;
	const current = workInProgress.alternate;

	if (current !== null) {
		currentDispatcher.current = HooksDispatcherOnUpdate;
	} else {
		currentDispatcher.current = HooksDispatcherOnMount;
	}

	const props = workInProgress.peddingProps;
	const Component = workInProgress.type;
	const children = Component(props);
	// 重置
	currentlyRenderingFiber = null;
	workInProgressHook = null;
	currentHook = null;
	return children;
}

const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState
};

const HooksDispatcherOnUpdate: Dispatcher = {
	useState: updateState
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

function updateState<T>(): [T, Dispatch<T>] {
	const hook = updateWorkInProgressHook();

	const queue = hook.updateQueue as UpdateQueue<T>;
	const dispatch = queue.dispatch as Dispatch<T>;
	const pedding = queue.shared.pedding as Update<T>;

	if (pedding !== null) {
		const { memoizedState } = processUpdateQueue(hook.memmoizedState, pedding);
		hook.memmoizedState = memoizedState;
	}

	return [hook.memmoizedState, dispatch];
}

function updateWorkInProgressHook() {
	let nextCurrentHook: Hook | null = null;
	if (currentHook === null) {
		const current = currentlyRenderingFiber?.alternate;
		if (current !== null) {
			nextCurrentHook = current?.memoizedState;
		} else {
			nextCurrentHook = null;
		}
	} else {
		nextCurrentHook = currentHook.next;
	}

	// 兼容在render过程中最末尾产生新的hook
	if (nextCurrentHook === null) {
		throw new Error('render过程中产生新的hook');
	}

	currentHook = nextCurrentHook;
	const hook: Hook = {
		memmoizedState: currentHook.memmoizedState,
		updateQueue: currentHook.updateQueue,
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
