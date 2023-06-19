import { FiberNode, createFiberFromElement } from './fiber';
import { ReactElementType } from 'shared/ReactTypes';
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbol';
import { HostText } from './workTags';
import { Placement } from './fiberFlags';

function ChildrenReconciler(shouldCheckFlags: boolean) {
	function reconcileSingleElement(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		element: ReactElementType
	) {
		const fiber = createFiberFromElement(element);
		fiber.return = returnFiber;
		return fiber;
	}

	function reconcileSingleTextNode(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		content: number | string
	) {
		const fiber = new FiberNode(HostText, { content }, null);
		fiber.return = returnFiber;
		return fiber;
	}

	function placeSingleChild(fiber: FiberNode) {
		if (shouldCheckFlags && fiber.alternate === null) {
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

		if (__DEV__) {
			console.log('为实现的子fiber类型', currentFiber);
		}

		return null;
	};
}

export const mountChildFibers = ChildrenReconciler(false);

export const reconcileChildFibers = ChildrenReconciler(true);
