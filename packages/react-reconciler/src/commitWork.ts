import {
	type Instance,
	type Container,
	appenChildIntoContainer,
	commitUpdate,
	removeChild,
	insertChildIntoContainer
} from 'hostConfig';
import { FiberNode, FiberRootNode, PeddingPassiveEffects } from './fiber';
import {
	type Flags,
	ChildDeletion,
	MutationMask,
	NoFlags,
	PassiveEffect,
	Placement,
	Update,
	PassiveMask,
	LayoutMask,
	Ref
} from './fiberFlags';
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTags';
import { Effect, FCUpdateQueue } from './fiberHooks';
import { HookHasEffect } from './hookEffectTags';

let nextEffect: FiberNode | null = null;

function commitEffects(
	paragraph: 'mutation' | 'layout',
	mask: Flags,
	callback: (effect: FiberNode, root: FiberRootNode) => void
) {
	return function (finishedWork: FiberNode, root: FiberRootNode) {
		nextEffect = finishedWork;

		while (nextEffect !== null) {
			const child: FiberNode | null = nextEffect.child;

			// 向下递归-找到第一个有副作用的子节点
			if ((nextEffect.subtreeFlags & mask) !== NoFlags && child !== null) {
				nextEffect = child;
			} else {
				// 向上遍历
				up: while (nextEffect !== null) {
					callback(nextEffect, root);

					const sibling: FiberNode | null = nextEffect.sibling;
					if (sibling !== null) {
						nextEffect = sibling;
						break up;
					}

					nextEffect = nextEffect.return;
				}
			}
		}
	};
}

export const commitMutationEffects = commitEffects(
	'mutation',
	MutationMask | PassiveMask,
	commitMutationEffectsOnFiber
);

export const commitLayoutEffects = commitEffects(
	'layout',
	LayoutMask,
	commitLayoutEffectsOnFiber
);

function commitMutationEffectsOnFiber(
	finishedWork: FiberNode,
	root: FiberRootNode
) {
	const { flags, tag } = finishedWork;

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
				commitChildDeletion(childToDelete, root);
			});
		}
		finishedWork.flags &= ~ChildDeletion;
	}
	if ((flags & PassiveEffect) !== NoFlags) {
		commitPassiveEffect(finishedWork, root, 'update');
		finishedWork.flags &= ~PassiveEffect;
	}
	if ((flags & Ref) !== NoFlags && tag === HostComponent) {
		safelyDetachRef(finishedWork);
	}

	if (__DEV__) {
		console.warn('commitMutationEffectsOnFiber还未实现的副作用', finishedWork);
	}
}

function commitLayoutEffectsOnFiber(
	finishedWork: FiberNode,
	root: FiberRootNode
) {
	const { flags, tag } = finishedWork;

	if ((flags & Ref) !== NoFlags && tag === HostComponent) {
		safelyAttachRef(finishedWork);
		finishedWork.flags &= ~Ref;
	}

	if (__DEV__) {
		console.warn('commitLayoutEffectsOnFiber还未实现的副作用', finishedWork);
	}
}

function safelyAttachRef(fiber: FiberNode) {
	const ref = fiber.ref;

	if (ref !== null) {
		if (typeof ref === 'function') {
			ref(fiber.stateNode);
		} else {
			ref.current = fiber.stateNode;
		}
	}
}

function safelyDetachRef(fiber: FiberNode) {
	const ref = fiber.ref;
	if (ref !== null) {
		if (typeof ref === 'function') {
			ref(null);
		} else {
			ref.current = null;
		}
	}
}

function commitPassiveEffect(
	fiber: FiberNode,
	root: FiberRootNode,
	type: keyof PeddingPassiveEffects
) {
	if (
		fiber.tag !== FunctionComponent ||
		(type === 'update' && (fiber.flags & PassiveEffect) === NoFlags)
	) {
		return;
	}

	const updateQueue = fiber.updateQueue as FCUpdateQueue<any>;
	if (updateQueue !== null) {
		const lastEffect = updateQueue.lastEffect as Effect;
		if (lastEffect === null) {
			console.warn('commitPassiveEffect的lastEffect不应该为null');
		}
		root.peddingPassiveEffects[type].push(lastEffect);
	}
}

export function commitHookEffectList(
	flags: Flags,
	effect: Effect,
	callback: (effect: Effect) => void
) {
	let nextEffect = effect.next as Effect;
	do {
		if ((nextEffect.tag & flags) === flags) {
			callback(nextEffect);
		}
		nextEffect = nextEffect.next as Effect;
	} while (nextEffect !== effect.next);
}

export function commitHookEffectListUnmount(flags: Flags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect) => {
		const destroy = effect.destroy;
		if (typeof destroy === 'function') {
			destroy();
		}
		effect.tag &= ~HookHasEffect;
	});
}

export function commitHookEffectListDestroy(flags: Flags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect) => {
		const destroy = effect.destroy;
		if (typeof destroy === 'function') {
			destroy();
		}
	});
}

export function commitHookEffectListCreate(flags: Flags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect) => {
		const create = effect.create;
		if (typeof create === 'function') {
			effect.destroy = create();
		}
	});
}

function recordChildrenToDelete(
	childrenToDelete: FiberNode[],
	unmountFiber: FiberNode
) {
	const lastOne = childrenToDelete[childrenToDelete.length - 1];
	if (!lastOne) {
		childrenToDelete.push(unmountFiber);
	} else {
		let node = lastOne.sibling;
		while (node !== null) {
			if (unmountFiber === node) {
				childrenToDelete.push(unmountFiber);
			}
			node = node.sibling;
		}
	}
}

function commitChildDeletion(childToDelete: FiberNode, root: FiberRootNode) {
	const rootChildrenToDelete: FiberNode[] = [];

	commitNestedComponent(childToDelete, (unmountFiber) => {
		switch (unmountFiber.tag) {
			case HostComponent:
				safelyDetachRef(unmountFiber);
				recordChildrenToDelete(rootChildrenToDelete, unmountFiber);
				return;
			case HostText:
				recordChildrenToDelete(rootChildrenToDelete, unmountFiber);
				return;
			case FunctionComponent:
				commitPassiveEffect(unmountFiber, root, 'unmount');
				return;
			default:
				if (__DEV__) {
					console.log('commitChildDeletion方法未处理的类型', unmountFiber);
				}
		}
	});

	if (rootChildrenToDelete.length) {
		const hostParent = getHostParent(childToDelete);
		if (hostParent) {
			rootChildrenToDelete.forEach((node) => {
				removeChild(hostParent, node.stateNode);
			});
		}
	}
	childToDelete.return = null;
	childToDelete.child = null;
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
