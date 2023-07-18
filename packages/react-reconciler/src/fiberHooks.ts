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
import type { Update, UpdateQueue } from './updateQueue';
import type { Action } from 'shared/ReactTypes';
import { type Lane, NoLane, requestUpdateLane } from './fiberLane';
import { Flags, PassiveEffect } from './fiberFlags';

import { Passive } from './hookEffectTags';

const { currentDispatcher } = internals;

interface Hook {
	memmoizedState: any;
	updateQueue: UpdateQueue<any> | null;
	next: Hook | null;
}

export interface Effect {
	tag: Flags;
	create: EffectCallback;
	destroy: EffectCallback;
	deps: EffectDeps;
	next: Effect | null;
}
export type EffectCallback = (() => void) | void;
export type EffectDeps = any[] | null;

interface FCUpdateQueue<State> extends UpdateQueue<State> {
	lastEffect: Effect | null;
}

let currentlyRenderingFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null;
let renderLane: Lane = NoLane;

export function renderWithHooks(workInProgress: FiberNode, lane: Lane) {
	currentlyRenderingFiber = workInProgress;
	const current = workInProgress.alternate;
	renderLane = lane;

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
	renderLane = NoLane;
	return children;
}

const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState,
	useEffect: mountEffect
};

const HooksDispatcherOnUpdate: Dispatcher = {
	useState: updateState,
	useEffect: mountEffect
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
	const lane = requestUpdateLane();
	const update = createUpdate(action, lane);
	enqueueUpdate(queue, update);
	scheduleUpdateOnFiber(currentlyRenderingFiber, lane);
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
	queue.shared.pedding = null;

	if (pedding !== null) {
		const { memoizedState } = processUpdateQueue(
			hook.memmoizedState,
			pedding,
			renderLane
		);
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

function mountEffect(create: EffectCallback, deps: EffectDeps) {
	const hook = mountWorkInProgressHook();
	const nextDeps = typeof deps === 'undefined' ? null : deps;
	(currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;

	hook.memmoizedState = pushEffect(
		Passive | PassiveEffect,
		create,
		undefined,
		nextDeps
	);
}

function pushEffect(
	hookFlag: Flags,
	create: EffectCallback,
	destroy: EffectCallback,
	deps: EffectDeps
) {
	const effect: Effect = {
		tag: hookFlag,
		create,
		destroy,
		deps,
		next: null
	};
	const fiber = currentlyRenderingFiber as FiberNode;
	const updateQueue = fiber.updateQueue as FCUpdateQueue<any>;

	if (updateQueue === null) {
		const updateQueue = createFCUpdateQueue();
		fiber.updateQueue = updateQueue;
		effect.next = effect;
		updateQueue.lastEffect = effect;
	} else {
		const lastEffect = updateQueue.lastEffect;
		if (lastEffect === null) {
			effect.next = effect;
			updateQueue.lastEffect = effect;
		} else {
			const firstEffect = updateQueue.lastEffect?.next as Effect;
			effect.next = firstEffect;
			(updateQueue.lastEffect as Effect).next = effect;
			updateQueue.lastEffect = effect;
		}
	}

	return effect;
}

function createFCUpdateQueue() {
	const updateQueue = createUpdateQueue() as FCUpdateQueue<any>;
	updateQueue.lastEffect = null;
	return updateQueue;
}
