import { scheduleMircoTask } from 'hostConfig';
import { beginWork } from './beginWork';
import {
	commitHookEffectListCreate,
	commitHookEffectListDestroy,
	commitHookEffectListUnmount,
	commitMutationEffects
} from './commitWork';
import { completeWork } from './completeWork';
import {
	FiberNode,
	FiberRootNode,
	PeddingPassiveEffects,
	createWorkInProgress
} from './fiber';
import { MutationMask, NoFlags, PassiveEffect } from './fiberFlags';
import {
	Lane,
	NoLane,
	SyncLane,
	getHighestPriorityLane,
	lanesToSchedulerPriority,
	markRootFinished,
	mergeLanes
} from './fiberLane';
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue';
import { HostRoot } from './workTags';
import {
	unstable_scheduleCallback as scheduleCallback,
	unstable_NormalPriority as NormalPriority,
	unstable_shouldYield as shouldYield,
	unstable_cancelCallback as cancelCallback
} from 'scheduler';
import { HookHasEffect, Passive } from './hookEffectTags';

let workInProgress: FiberNode | null = null;
let workInProgressRootRenderLane: Lane = NoLane;
let rootDoesPassiveEffects = false;

const RootInCompleted = 1;
const RootCompleted = 2;

function prepareFreshStack(root: FiberRootNode, lane: Lane) {
	root.finishedLane = NoLane;
	root.finishedWork = null;
	workInProgress = createWorkInProgress(root.current, {});
	workInProgressRootRenderLane = lane;
}

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	const root = markUpdateFormFiberToRoot(fiber);
	markRootUpdated(root, lane);
	ensureRootIsScheduled(root);
}

function markRootUpdated(root: FiberRootNode, lane: Lane) {
	root.peddingLanes = mergeLanes(root.peddingLanes, lane);
}

// 从当前节点向上回到FiberRootNode
function markUpdateFormFiberToRoot(fiber: FiberNode) {
	let parent = fiber.return;
	let node = fiber;

	while (parent !== null) {
		node = parent;
		parent = node.return;
	}
	if (node.tag === HostRoot) {
		return node.stateNode;
	}

	return null;
}

function ensureRootIsScheduled(root: FiberRootNode) {
	const currCallbackNode = root.callbackNode;
	const updateLane = getHighestPriorityLane(root.peddingLanes);

	if (updateLane === NoLane) {
		if (currCallbackNode) {
			cancelCallback(currCallbackNode);
		}
		root.callbackNode = null;
		root.callbackPriority = NoLane;
		return;
	}

	const prevPriority = root.callbackPriority;
	const currPriority = updateLane;
	if (currPriority === prevPriority) {
		return;
	}

	if (currCallbackNode) {
		cancelCallback(currCallbackNode);
	}

	let newCallbackNode = null;

	if (updateLane === SyncLane) {
		// 调度同步优先级
		if (__DEV__) {
			console.log('ensureRootIsScheduled正在调度优先级：', updateLane);
		}
		scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
		scheduleMircoTask(flushSyncCallbacks);
	} else {
		// 调度其他优先级
		const schedulerPriority = lanesToSchedulerPriority(updateLane);

		newCallbackNode = scheduleCallback(
			schedulerPriority,
			// @ts-ignore
			performConcurrentWorkOnRoot.bind(null, root)
		);
	}

	root.callbackNode = newCallbackNode;
	root.callbackPriority = currPriority;
}

function performConcurrentWorkOnRoot(
	root: FiberRootNode,
	didTimeout: boolean
): any {
	const currCallback = root.callbackNode;

	// 确定所有的effect执行完毕，因为在effect中可能会触发更高优先级的update
	const didFlushPassiveEffect = flushPassiveEffects(root.peddingPassiveEffects);
	if (didFlushPassiveEffect) {
		if (currCallback !== root.callbackNode) {
			return null;
		}
	}

	const lane = getHighestPriorityLane(root.peddingLanes);

	if (lane === NoLane) {
		return null;
	}

	const needSync = lane === SyncLane || didTimeout;
	const exsitingStatus = renderRoot(root, !needSync);

	ensureRootIsScheduled(root);

	if (exsitingStatus === RootInCompleted) {
		if (root.callbackNode !== currCallback) {
			return null;
		}
		return performConcurrentWorkOnRoot.bind(null, root);
	}

	if (exsitingStatus === RootCompleted) {
		const finishedWord = root.current.alternate;
		root.finishedWork = finishedWord;
		root.finishedLane = workInProgressRootRenderLane;
		workInProgressRootRenderLane = NoLane;

		commitRoot(root);
	} else {
		if (__DEV__) {
			console.error('同步阶段未处理的退出render状态');
		}
	}
}

export function performSyncWorkOnRoot(root: FiberRootNode) {
	const nextLane = getHighestPriorityLane(root.peddingLanes);
	if (nextLane !== SyncLane) {
		ensureRootIsScheduled(root);
		return;
	}

	const exsitingStatus = renderRoot(root, false);

	if (exsitingStatus === RootCompleted) {
		const finishedWord = root.current.alternate;
		root.finishedWork = finishedWord;
		root.finishedLane = workInProgressRootRenderLane;
		workInProgressRootRenderLane = NoLane;

		commitRoot(root);
	} else {
		if (__DEV__) {
			console.error('同步阶段未处理的退出render状态');
		}
	}
}

function renderRoot(root: FiberRootNode, shouldTimeslice: boolean) {
	const lane = getHighestPriorityLane(root.peddingLanes);

	if (workInProgressRootRenderLane !== lane) {
		prepareFreshStack(root, lane);
	}

	do {
		try {
			if (shouldTimeslice) {
				workConcurrentLoop();
			} else {
				workSyncLoop();
			}
			break;
		} catch (error) {
			workInProgress = null;
			if (__DEV__) {
				console.warn('工作循环出错了');
			}
		}
	} while (true);

	if (shouldTimeslice && workInProgress !== null) {
		return RootInCompleted;
	}
	if (!shouldTimeslice && workInProgress === null && __DEV__) {
		console.error('render阶段workInProgress不应该为null');
	}
	return RootCompleted;
}

function commitRoot(root: FiberRootNode) {
	const finishedWork = root.finishedWork;
	const lane = root.finishedLane;

	if (finishedWork === null) {
		return;
	}

	root.finishedWork = null;
	root.finishedLane = NoLane;
	markRootFinished(root, lane);

	if (__DEV__) {
		console.warn('conmitRoot执行finishedWork', finishedWork);
	}

	if (
		(finishedWork.flags & PassiveEffect) !== NoFlags ||
		(finishedWork.subtreeFlags & PassiveEffect) !== NoFlags
	) {
		if (!rootDoesPassiveEffects) {
			rootDoesPassiveEffects = true;
			scheduleCallback(NormalPriority, () => {
				flushPassiveEffects(root.peddingPassiveEffects);
				return;
			});
		}
	}

	// 标识rootFiberNode和子节点是否存在副作用
	const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;
	const subTreeHasEffect =
		(finishedWork.subtreeFlags & MutationMask) !== NoFlags;

	// 有副作用则执行对应的commit阶段: 三个阶段beforeMutation、mutation、layout
	if (rootHasEffect || subTreeHasEffect) {
		// beforn=eMutaion
		// mutation

		commitMutationEffects(finishedWork, root);
		// mutation和layout之前切换
		root.current = finishedWork;
		// layout
	} else {
		// 切换fiber树
		root.current = finishedWork;
	}

	if (__DEV__) {
		console.warn('commitRoot未执行commit', root);
	}

	rootDoesPassiveEffects = false;
	ensureRootIsScheduled(root);
}

function flushPassiveEffects(peddingPassiveEffects: PeddingPassiveEffects) {
	let didFlushPassiveEffects = false;
	peddingPassiveEffects.unmount.forEach((effect) => {
		didFlushPassiveEffects = true;
		commitHookEffectListUnmount(Passive, effect);
	});
	peddingPassiveEffects.unmount = [];

	peddingPassiveEffects.update.forEach((effect) => {
		didFlushPassiveEffects = true;
		commitHookEffectListDestroy(Passive | HookHasEffect, effect);
	});
	peddingPassiveEffects.update.forEach((effect) => {
		didFlushPassiveEffects = true;
		commitHookEffectListCreate(Passive | HookHasEffect, effect);
	});
	peddingPassiveEffects.update = [];

	flushSyncCallbacks();

	return didFlushPassiveEffects;
}

function workSyncLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}

function workConcurrentLoop() {
	while (workInProgress !== null && !shouldYield()) {
		performUnitOfWork(workInProgress);
	}
}

function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber, workInProgressRootRenderLane);
	fiber.memoizedProps = fiber.peddingProps;
	if (next !== null) {
		workInProgress = next;
	} else {
		completeUnitOfWork(fiber);
	}
}

function completeUnitOfWork(fiber: FiberNode) {
	let node: FiberNode | null = fiber;

	do {
		completeWork(node);

		const sibling = node.sibling;
		if (sibling) {
			workInProgress = sibling;
			return;
		}

		node = node.return;
		workInProgress = node;
	} while (node !== null);
}
