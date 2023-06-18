import { ReactElementType } from 'shared/ReactTypes';
import type { FiberNode } from './fiber';
import { UpdateQueue, processUpdateQueue } from './updateQueue';
import { HostComponent, HostRoot, HostText } from './workTags';
import { mountChildFibers, reconcileChildFibers } from './childFIber';

export function beginWork(workInProgress: FiberNode) {
	switch (workInProgress.tag) {
		case HostRoot:
			return updateHostRoot(workInProgress);
		case HostComponent:
			return updateHostComponent(workInProgress);
		case HostText: {
			return null;
		}
		default:
			if (__DEV__) {
				console.log('未实现的beginWork类型', workInProgress);
			}
			break;
	}
	return null;
}

/*
	1.计算最新的状态
	2.创建子fiber
*/
function updateHostRoot(workInProgress: FiberNode) {
	const baseState = workInProgress.memoizedState;
	const updateQueue =
		workInProgress.updateQueue as UpdateQueue<ReactElementType>;
	const pedding = updateQueue.shared.pedding;
	updateQueue.shared.pedding = null;
	const { memoizedState } = processUpdateQueue(baseState, pedding);
	workInProgress.memoizedState = memoizedState;

	const nextChildren = workInProgress.memoizedState;
	reconcileChildren(workInProgress, nextChildren);
	return workInProgress.child;
}

/*
	创建子fiber
*/
function updateHostComponent(workInProgress: FiberNode) {
	const nextProps = workInProgress.peddingProps;
	const nextChildren = nextProps.children;
	reconcileChildren(workInProgress, nextChildren);
	return workInProgress.child;
}

function reconcileChildren(
	workInProgress: FiberNode,
	children: ReactElementType
) {
	const current = workInProgress.alternate;
	// 对应mount
	if (current !== null) {
		workInProgress.child = reconcileChildFibers(
			workInProgress,
			current.child,
			children
		);
	} else {
		workInProgress.child = mountChildFibers(workInProgress, null, children);
	}
}
