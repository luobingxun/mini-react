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
	getHightestPriorityLane,
	markRootFinished,
	mergeLanes
} from './fiberLane';
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue';
import { HostRoot } from './workTags';
import {
	unstable_scheduleCallback as scheduleCallback,
	unstable_NormalPriority as NormalPriority
} from 'scheduler';
import { HookHasEffect, Passive } from './hookEffectTags';

let workInProgress: FiberNode | null = null;
let workInProgressRootRenderLane: Lane = NoLane;
let rootDoesPassiveEffects = false;

function prepareFreshStack(root: FiberRootNode, lane: Lane) {
	workInProgress = createWorkInProgress(root.current, {});
	workInProgressRootRenderLane = lane;
}

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	const root = markUpdateFormFiberToRoot(fiber);
	markRootUpdated(root, lane);
	ensureRootIsScheduled(root);
}

function ensureRootIsScheduled(root: FiberRootNode) {
	const updateLane = getHightestPriorityLane(root.peddingLanes);

	if (updateLane === NoLane) {
		return;
	}

	if (updateLane === SyncLane) {
		// 调度同步优先级
		if (__DEV__) {
			console.log('ensureRootIsScheduled正在调度优先级：', updateLane);
		}
		scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane));
		scheduleMircoTask(flushSyncCallbacks);
	} else {
		// 调度其他优先级
	}
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

export function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
	const nextLane = getHightestPriorityLane(root.peddingLanes);
	if (nextLane !== SyncLane) {
		ensureRootIsScheduled(root);
		return;
	}

	prepareFreshStack(root, lane);

	do {
		try {
			workLoop();
			break;
		} catch (error) {
			workInProgress = null;
			if (__DEV__) {
				console.warn('工作循环出错了');
			}
		}
	} while (true);

	const finishedWord = root.current.alternate;
	root.finishedWork = finishedWord;
	root.finishedLane = workInProgressRootRenderLane;
	workInProgressRootRenderLane = NoLane;

	commitRoot(root);
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
	peddingPassiveEffects.unmount.forEach((effect) => {
		commitHookEffectListUnmount(Passive, effect);
	});
	peddingPassiveEffects.unmount = [];

	peddingPassiveEffects.update.forEach((effect) => {
		commitHookEffectListDestroy(Passive | HookHasEffect, effect);
	});
	peddingPassiveEffects.update.forEach((effect) => {
		commitHookEffectListCreate(Passive | HookHasEffect, effect);
	});
	peddingPassiveEffects.update = [];

	flushSyncCallbacks();
}

function workLoop() {
	while (workInProgress !== null) {
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
