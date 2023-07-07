import {
	type Container,
	appenChildIntoContainer,
	commitUpdate,
	removeChild
} from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import {
	ChildDeletion,
	MutationMask,
	NoFlags,
	Placement,
	Update
} from './fiberFlags';
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTags';

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
	if ((flags & Placement) !== NoFlags) {
		commitPlacement(finishedWork);
		finishedWork.flags &= ~Placement;
	}
	if ((flags & Update) !== NoFlags) {
		commitUpdate(finishedWork);
		finishedWork.flags &= ~Update;
	}
	if ((flags & ChildDeletion) !== NoFlags) {
		const deletions = finishedWork.deletions;
		if (deletions !== null) {
			deletions.forEach((childToDelete) => {
				commitChildDeletion(childToDelete);
			});
		}
		finishedWork.flags &= ~ChildDeletion;
	}

	if (__DEV__) {
		console.warn('commitMutationEffectsOnfiber还未实现的副作用', finishedWork);
	}
}

function commitChildDeletion(childToDelete: FiberNode) {
	let hostUnmountNode: FiberNode | null = null;

	commitNestedComponent(childToDelete, (unmountFiber) => {
		switch (unmountFiber.tag) {
			case HostComponent:
				if (hostUnmountNode === null) {
					hostUnmountNode = unmountFiber;
				}
				return;
			case HostText:
				if (hostUnmountNode === null) {
					hostUnmountNode = unmountFiber;
				}
				return;
			case FunctionComponent:
			default:
				if (__DEV__) {
					console.log('commitChildDeletion方法未处理的类型', unmountFiber);
				}
		}
	});

	if (hostUnmountNode !== null) {
		const hostParent = getHostParent(hostUnmountNode);
		if (hostParent) {
			removeChild(hostParent, (hostUnmountNode as FiberNode).stateNode);
		}
		(hostUnmountNode as FiberNode).return = null;
		(hostUnmountNode as FiberNode).child = null;
	}
}

function commitNestedComponent(
	childToDelete: FiberNode,
	onCommitUnmount: (unmountFiber: FiberNode) => void
) {
	let node = childToDelete;
	while (node !== null) {
		onCommitUnmount(node);

		if (node.child !== null) {
			node.child.return = node;
			node = node.child;
			continue;
		}

		if (node === childToDelete) {
			return;
		}

		while (node.sibling === null) {
			if (node.return === null || node.return === childToDelete) {
				return;
			}
			node = node.return;
		}

		node.sibling.return = node.return;
		node = node.sibling;
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
