import {
	type Container,
	appenChildIntoContainer,
	commitUpdate,
	removeChild,
	Instance,
	insertChildIntoContainer
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

let nextEffect: FiberNode | null = null;

export function commitMutationEffects(finishedWork: FiberNode) {
	nextEffect = finishedWork;

	while (nextEffect !== null) {
		const child: FiberNode | null = nextEffect.child;

		// 向下递归-找到第一个有副作用的子节点
		if (
			(nextEffect.subtreeFlags & MutationMask) !== NoFlags &&
			child !== null
		) {
			nextEffect = child;
		} else {
			// const sibling: FiberNode | null = nextEffect.sibling;

			// 向上遍历
			up: while (nextEffect !== null) {
				commitMutationEffectsOnfiber(nextEffect);

				const sibling: FiberNode | null = nextEffect.sibling;
				if (sibling !== null) {
					nextEffect = sibling;
					break up;
				}

				nextEffect = nextEffect.return;
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
	const hostSibling = getHostSibling(finishedWork);

	if (hostParent) {
		insertOrAppendPlacementNodeIntoContainer(
			hostParent,
			finishedWork,
			hostSibling
		);
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

function getHostSibling(finishedWork: FiberNode) {
	let node: FiberNode = finishedWork;

	findSibling: while (true) {
		while (node.sibling === null) {
			const parent = node.return;
			if (
				parent === null ||
				parent.tag === HostComponent ||
				parent.tag === HostRoot
			) {
				return null;
			}
			node = parent;
		}
		node.sibling.return = node.return;
		node = node.sibling;

		while (node.tag !== HostText && node.tag !== HostComponent) {
			if ((node.flags & Placement) !== NoFlags) {
				continue findSibling;
			}
			if (node.child === null) {
				continue findSibling;
			} else {
				node.child.return = node;
				node = node.child;
			}
		}

		if ((node.flags & Placement) === NoFlags) {
			return node.stateNode;
		}
	}
}

function insertOrAppendPlacementNodeIntoContainer(
	hostParent: Container,
	finishedWork: FiberNode,
	before?: Instance
) {
	const tag = finishedWork.tag;
	if (tag === HostComponent || tag === HostText) {
		if (before) {
			insertChildIntoContainer(hostParent, finishedWork.stateNode, before);
		} else {
			appenChildIntoContainer(hostParent, finishedWork.stateNode);
		}
		return;
	}
	const child = finishedWork.child;
	if (child !== null) {
		insertOrAppendPlacementNodeIntoContainer(hostParent, child);

		let sibling = child.sibling;

		while (sibling !== null) {
			insertOrAppendPlacementNodeIntoContainer(hostParent, sibling);
			sibling = sibling.sibling;
		}
	}
}
