import { Container, appenChildIntoContainer } from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import { MutationMask, NoFlags, Placement } from './fiberFlags';
import { HostComponent, HostRoot, HostText } from './workTags';

let nextEffects: FiberNode | null = null;

export function commitMutationEffects(finishedWork: FiberNode) {
	nextEffects = finishedWork;

	while (nextEffects !== null) {
		const child: FiberNode | null = nextEffects.child;

		// 向下递归-找到第一个有副作用的子节点
		if (
			(nextEffects.subtreeFlags & MutationMask) !== NoFlags &&
			child !== null
		) {
			nextEffects = child;
		} else {
			const sibling: FiberNode | null = nextEffects.sibling;

			// 向上遍历
			up: while (nextEffects !== null) {
				commitMutationEffectsOnfiber(nextEffects);

				if (sibling !== null) {
					nextEffects = sibling;
					break up;
				}

				nextEffects = nextEffects.return;
			}
		}
	}
}

function commitMutationEffectsOnfiber(finishedWork: FiberNode) {
	const flags = finishedWork.flags;

	// 处理插入移动副作用，在把Placement移除
	if ((flags & MutationMask) !== NoFlags) {
		commitPlacement(finishedWork);
		finishedWork.flags &= ~Placement;
	}

	// Update
	// ChildDeletion

	if (__DEV__) {
		console.warn('commitMutationEffectsOnfiber还未实现的副作用', finishedWork);
	}
}

function commitPlacement(finishedWork: FiberNode) {
	if (__DEV__) {
		console.log('commitPlacement执行', finishedWork);
	}

	const hostParent = getHostParent(finishedWork);
	if (hostParent) {
		appendPlacementNodeIntoContainer(hostParent, finishedWork);
	}
}

function getHostParent(finishedWork: FiberNode) {
	let parent = finishedWork.return;

	while (parent !== null) {
		const parentTag = parent.tag;
		if (parentTag === HostComponent) {
			return parent.stateNode;
		}
		if (parentTag === HostRoot) {
			return (parent.stateNode as FiberRootNode).container;
		}
		parent = parent.return;
	}
}

function appendPlacementNodeIntoContainer(
	hostParent: Container,
	finishedWork: FiberNode
) {
	const tag = finishedWork.tag;
	if (tag === HostComponent || tag === HostText) {
		appenChildIntoContainer(hostParent, finishedWork.stateNode);
		return;
	}
	const child = finishedWork.child;
	if (child !== null) {
		appendPlacementNodeIntoContainer(hostParent, child);

		let sibling = child.sibling;

		while (sibling !== null) {
			appendPlacementNodeIntoContainer(hostParent, sibling);
			sibling = sibling.sibling;
		}
	}
}
