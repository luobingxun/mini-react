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

import { HookHasEffect, Passive } from './hookEffectTags';

const { currentDispatcher, reactCurrentBatchConfig } = internals;

interface Hook {
	memoizedState: any;
	updateQueue: UpdateQueue<any> | null;
	next: Hook | null;
	baseState: any;
	baseQueue: Update<any> | null;
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

export interface FCUpdateQueue<State> extends UpdateQueue<State> {
	lastEffect: Effect | null;
}

let currentlyRenderingFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null;
let renderLane: Lane = NoLane;

export function renderWithHooks(workInProgress: FiberNode, lane: Lane) {
	currentlyRenderingFiber = workInProgress;
	const current = workInProgress.alternate;
	workInProgress.memoizedState = null;
	workInProgress.updateQueue = null;
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
	useEffect: mountEffect,
	useTransition: mountTransition
};

const HooksDispatcherOnUpdate: Dispatcher = {
	useState: updateState,
	useEffect: updateEffect,
	useTransition: updateTransition
};

function mountState<T>(initialState: T | (() => T)): [T, Dispatch<T>] {
	const hook = mountWorkInProgressHook();
	let memoizedState;
	if (initialState instanceof Function) {
		memoizedState = initialState();
	} else {
		memoizedState = initialState;
	}
	hook.memoizedState = memoizedState;
	hook.baseState = memoizedState;
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
		memoizedState: null,
		updateQueue: null,
		next: null,
		baseState: null,
		baseQueue: null
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

	const baseState = hook.baseState;
	const current = currentHook as Hook;
	let baseQueue = current.baseQueue;

	if (pedding !== null) {
		// 合并update链表
		if (baseQueue !== null) {
			const baseQueueFirst = baseQueue.next;
			const peddingQueueFirst = pedding.next;

			baseQueue.next = peddingQueueFirst;
			pedding.next = baseQueueFirst;
		}
		current.baseQueue = pedding;
		baseQueue = pedding;
		queue.shared.pedding = null;
	}

	if (baseQueue !== null) {
		const {
			memoizedState,
			baseQueue: newBaseQueue,
			baseState: newBaseState
		} = processUpdateQueue(baseState, baseQueue, renderLane);
		hook.memoizedState = memoizedState;
		hook.baseState = newBaseState;
		hook.baseQueue = newBaseQueue;
	}

	return [hook.memoizedState, dispatch];
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
		memoizedState: currentHook.memoizedState,
		updateQueue: currentHook.updateQueue,
		next: null,
		baseState: currentHook.baseState,
		baseQueue: currentHook.baseQueue
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

	hook.memoizedState = pushEffect(
		Passive | HookHasEffect,
		create,
		undefined,
		nextDeps
	);
}

function updateEffect(create: EffectCallback, deps: EffectDeps) {
	const hook = updateWorkInProgressHook();
	const nextDeps = typeof deps === 'undefined' ? null : deps;
	let destroy: EffectCallback | void;

	if (currentHook !== null) {
		const prevEffect = hook.memoizedState as Effect;
		destroy = prevEffect.destroy;

		if (nextDeps !== null) {
			const prevDeps = prevEffect.deps;

			if (areHookInputsEquals(nextDeps, prevDeps)) {
				hook.memoizedState = pushEffect(Passive, create, destroy, nextDeps);
				return;
			}
		}

		(currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;
		hook.memoizedState = pushEffect(
			Passive | HookHasEffect,
			create,
			destroy,
			nextDeps
		);
	}
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
		const newUpdateQueue = createFCUpdateQueue();
		fiber.updateQueue = newUpdateQueue;
		effect.next = effect;
		newUpdateQueue.lastEffect = effect;
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

function areHookInputsEquals(nextDeps: EffectDeps, prevDeps: EffectDeps) {
	if (prevDeps === null || nextDeps === null) {
		return false;
	}

	for (let i = 0; i < nextDeps.length && i < prevDeps.length; i++) {
		if (Object.is(prevDeps[i], nextDeps[i])) {
			continue;
		}
		return false;
	}

	return true;
}

function mountTransition(): [boolean, (callback: () => void) => void] {
	const [isPedding, setPedding] = mountState(false);
	const hook = mountWorkInProgressHook();
	const start = startTransition.bind(null, setPedding);
	hook.memoizedState = start;
	return [isPedding, start];
}

function updateTransition(): [boolean, (callback: () => void) => void] {
	const [isPedding] = updateState<boolean>();
	const hook = updateWorkInProgressHook();
	const start = hook.memoizedState;
	return [isPedding, start];
}

function startTransition(setPedding: Dispatch<boolean>, callback: () => void) {
	setPedding(true);

	const prevTransition = reactCurrentBatchConfig.transition;
	reactCurrentBatchConfig.transition = 1;

	callback();
	setPedding(false);

	reactCurrentBatchConfig.transition = prevTransition;
}
