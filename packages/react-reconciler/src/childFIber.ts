import {
	FiberNode,
	createFiberFromElement,
	createFiberFromFragment,
	createWorkInProgress
} from './fiber';
import type { Key, Props, ReactElementType } from 'shared/ReactTypes';
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from 'shared/ReactSymbol';
import { HostText } from './workTags';
import { ChildDeletion, Placement } from './fiberFlags';

type ExistingChildren = Map<string | number, FiberNode>;

function ChildrenReconciler(shouldTrackEffect: boolean) {
	function deleteChild(returnFiber: FiberNode, currentFiber: FiberNode) {
		if (!shouldTrackEffect) {
			return;
		}
		const deletions = returnFiber.deletions;
		if (deletions === null) {
			returnFiber.deletions = [currentFiber];
			returnFiber.flags |= ChildDeletion;
		} else {
			deletions.push(currentFiber);
		}
	}

	function deleteRemainingChildren(
		returnFiber: FiberNode,
		currentFirstFiber: FiberNode | null
	) {
		let current = currentFirstFiber;
		while (current !== null) {
			deleteChild(returnFiber, current);
			current = current.sibling;
		}
	}

	function reconcileSingleElement(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		element: ReactElementType
	) {
		const key = element.key;
		while (currentFiber !== null) {
			if (key === currentFiber.key) {
				if (element.$$typeof === REACT_ELEMENT_TYPE) {
					if (element.type === currentFiber.type) {
						let props = element.props;
						if (element.type === REACT_FRAGMENT_TYPE) {
							props = element.props.children;
						}
						// 复用fiber
						const existing = useFiber(currentFiber, props);
						deleteRemainingChildren(returnFiber, currentFiber.sibling);
						existing.return = returnFiber;
						return existing;
					}
					deleteRemainingChildren(returnFiber, currentFiber);
					break;
				} else {
					if (__DEV__) {
						console.warn('不是reactElement类型');
					}
					break;
				}
			} else {
				deleteChild(returnFiber, currentFiber);
				currentFiber = currentFiber.sibling;
			}
		}

		let fiber: FiberNode;
		if (element.type === REACT_FRAGMENT_TYPE) {
			fiber = createFiberFromFragment(
				element.props.children,
				element.props.key
			);
		} else {
			fiber = createFiberFromElement(element);
		}

		fiber.return = returnFiber;
		return fiber;
	}

	function reconcileSingleTextNode(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		content: number | string
	) {
		while (currentFiber !== null) {
			if (currentFiber.tag === HostText) {
				const existing = useFiber(currentFiber, { content });
				deleteRemainingChildren(returnFiber, currentFiber.sibling);
				existing.return = returnFiber;
				return existing;
			} else {
				deleteChild(returnFiber, currentFiber);
				currentFiber = currentFiber.sibling;
			}
		}
		const fiber = new FiberNode(HostText, { content }, null);
		fiber.return = returnFiber;
		return fiber;
	}

	function placeSingleChild(fiber: FiberNode) {
		if (shouldTrackEffect && fiber.alternate === null) {
			fiber.flags |= Placement;
		}
		return fiber;
	}

	function reconcileChildrenArray(
		returnFiber: FiberNode,
		currentFirstFiber: FiberNode | null,
		newChild: any[]
	) {
		let lastPlacedIndex = 0;
		let firstNewFiber: FiberNode | null = null;
		let lastNewFiber: FiberNode | null = null;

		// 1.将current的所有fiber加入到map中
		const existingChildren: ExistingChildren = new Map();
		let current = currentFirstFiber;
		while (current !== null) {
			const keyToUse = current.key !== null ? current.key : current.index;
			existingChildren.set(keyToUse, current);
			current = current.sibling;
		}

		for (let i = 0; i < newChild.length; i++) {
			// 2.遍历element寻找可复用的fiber
			const after = newChild[i];
			const newFiber = updateFromMap(returnFiber, existingChildren, i, after);

			if (newFiber === null) {
				continue;
			}

			// 3.判断插入或者移除
			newFiber.return = returnFiber;
			newFiber.index = i;

			if (lastNewFiber === null) {
				firstNewFiber = newFiber;
				lastNewFiber = newFiber;
			} else {
				lastNewFiber.sibling = newFiber;
				lastNewFiber = lastNewFiber.sibling;
			}

			if (!shouldTrackEffect) {
				continue;
			}

			const current = newFiber.alternate;
			if (current !== null) {
				const oldIndex = current.index;
				if (oldIndex < lastPlacedIndex) {
					newFiber.flags |= Placement;
					continue;
				} else {
					lastPlacedIndex = oldIndex;
				}
			} else {
				newFiber.flags |= Placement;
			}
		}

		// 4.将map中剩余的标记为删除
		existingChildren.forEach((childToDelete) => {
			deleteChild(returnFiber, childToDelete);
		});

		return firstNewFiber;
	}

	return function reconcileChildFibers(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild: ReactElementType | null
	) {
		const isUnkeyedTopLevelFragment =
			typeof newChild === 'object' &&
			newChild !== null &&
			newChild.key === null &&
			newChild.type === REACT_FRAGMENT_TYPE;
		if (isUnkeyedTopLevelFragment) {
			newChild = newChild?.props.children;
		}

		// 单个节点
		if (typeof newChild === 'object' && newChild !== null) {
			const $$typeof = newChild.$$typeof;
			switch ($$typeof) {
				case REACT_ELEMENT_TYPE: {
					return placeSingleChild(
						reconcileSingleElement(returnFiber, currentFiber, newChild)
					);
				}
				default:
					if (__DEV__) {
						console.log('未实现的ELMENT类型');
					}
			}

			// 多个子节点
			if (Array.isArray(newChild)) {
				return reconcileChildrenArray(returnFiber, currentFiber, newChild);
			}
		}

		// 文本节点
		if (typeof newChild === 'string' || typeof newChild === 'number') {
			return placeSingleChild(
				reconcileSingleTextNode(returnFiber, currentFiber, newChild)
			);
		}

		// 兜底的情况
		if (currentFiber !== null) {
			deleteChild(returnFiber, currentFiber);
		}

		if (__DEV__) {
			console.log('为实现的子fiber类型', currentFiber);
		}

		return null;
	};
}

function updateFromMap(
	returnFiber: FiberNode,
	existingChildren: ExistingChildren,
	index: number,
	element: any
) {
	const keyToUse = element.key !== null ? element.key : index;
	const before = existingChildren.get(keyToUse);

	if (typeof element === 'string' || typeof element === 'number') {
		if (before) {
			if (before.tag === HostText) {
				existingChildren.delete(keyToUse);
				return useFiber(before, { content: element + '' });
			}
		}
		return new FiberNode(HostText, { content: element + '' }, null);
	}

	if (typeof element === 'object' && element !== null) {
		// TODO: element为数组类型
		if (Array.isArray(element)) {
			return updateFragment(
				returnFiber,
				before,
				element,
				keyToUse,
				existingChildren
			);
		}

		switch (element.$$typeof) {
			case REACT_ELEMENT_TYPE:
				if (element.type === REACT_FRAGMENT_TYPE) {
					return updateFragment(
						returnFiber,
						before,
						element.props.children,
						keyToUse,
						existingChildren
					);
				}
				if (before) {
					if (before.type === element.type) {
						existingChildren.delete(keyToUse);
						return useFiber(before, element.props);
					}
				}
				return createFiberFromElement(element);
			default:
				if (__DEV__) {
					console.warn('updateFormMap为实现的类型', element);
				}
				break;
		}
	}

	return null;
}

function updateFragment(
	returnFiber: FiberNode,
	current: FiberNode | undefined,
	elements: any,
	key: Key,
	existingChildren: ExistingChildren
) {
	let fiber: FiberNode;
	if (!current || current.type !== REACT_FRAGMENT_TYPE) {
		fiber = createFiberFromFragment(elements, key);
	} else {
		existingChildren.delete(key);
		fiber = useFiber(current, elements);
	}
	fiber.return = returnFiber;
	return fiber;
}

function useFiber(fiber: FiberNode, props: Props) {
	const clone = createWorkInProgress(fiber, props);
	clone.sibling = null;
	clone.index = 0;
	return clone;
}

export const mountChildFibers = ChildrenReconciler(false);

export const reconcileChildFibers = ChildrenReconciler(true);
