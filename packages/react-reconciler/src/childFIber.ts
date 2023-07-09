import {
	FiberNode,
	createFiberFromElement,
	createWorkInProgress
} from './fiber';
import type { Props, ReactElementType } from 'shared/ReactTypes';
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbol';
import { HostText } from './workTags';
import { ChildDeletion, Placement } from './fiberFlags';

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
						// 复用fiber
						const existing = useFiber(currentFiber, element.props);
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

		const fiber = createFiberFromElement(element);
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

	return function reconcileChildFibers(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild: ReactElementType | null
	) {
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
					return null;
			}
		}

		// 多个子节点
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

function useFiber(fiber: FiberNode, props: Props) {
	const clone = createWorkInProgress(fiber, props);
	clone.sibling = null;
	clone.index = 0;
	return clone;
}

export const mountChildFibers = ChildrenReconciler(false);

export const reconcileChildFibers = ChildrenReconciler(true);
