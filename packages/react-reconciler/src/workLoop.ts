import { beginWork } from './beginWork';
import { commitMutationEffects } from './commitWork';
import { completeWork } from './completeWork';
import { FiberNode, FiberRootNode, createWorkInProgress } from './fiber';
import { MutationMask, NoFlags } from './fiberFlags';
import { HostRoot } from './workTags';

let workInProgress: FiberNode | null = null;

function prepareFreshStack(root: FiberRootNode) {
	workInProgress = createWorkInProgress(root.current, {});
}

export function scheduleUpdateOnFiber(fiber: FiberNode) {
	const root = markUpdateFormFiberToRoot(fiber);
	renderRoot(root);
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

export function renderRoot(root: FiberRootNode) {
	prepareFreshStack(root);

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

	conmitRoot(root);
}

function conmitRoot(root: FiberRootNode) {
	const finishedWork = root.finishedWork;

	if (finishedWork === null) {
		return;
	}

	root.finishedWork = null;

	if (__DEV__) {
		console.warn('conmitRoot没有finishedWork', finishedWork);
	}

	// 标识rootFiberNode和子节点是否存在副作用
	const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;
	const subTreeHasEffect =
		(finishedWork.subtreeFlags & MutationMask) !== NoFlags;

	// 有副作用则执行对应的commit阶段: 三个阶段beforeMutation、mutation、layout
	if (rootHasEffect || subTreeHasEffect) {
		// beforn=eMutaion
		// mutation

		commitMutationEffects(finishedWork);
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
}

function workLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}

function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber);
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
