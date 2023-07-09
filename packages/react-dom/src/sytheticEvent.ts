import { Container } from 'hostConfig';
import type { Props } from 'shared/ReactTypes';

const elementPropsKey = '__props_key';

type EventCallback = (e: SytheticEvent) => void;

interface Paths {
	capture: EventCallback[];
	buddle: EventCallback[];
}
export interface SytheticEvent extends Event {
	__stopPropagation: boolean;
}

export interface DOMElement extends Element {
	[elementPropsKey]?: Props;
}

export function updateFiberProps(element: DOMElement, props: Props) {
	element[elementPropsKey] = props;
}

const validEventTypeList = ['click'];

export function initEvent(container: Container, eventType: string) {
	if (!validEventTypeList.includes(eventType)) {
		console.log('暂未实现该事件类型', eventType);
		return;
	}
	if (__DEV__) {
		console.warn('initEvent事件开始初始化');
	}
	container.addEventListener(eventType, (e: Event) => {
		dispatchEvents(container, eventType, e);
	});
}

function dispatchEvents(container: Container, eventType: string, e: Event) {
	const currentElement = e.target as DOMElement;
	if (currentElement === null) {
		return;
	}

	// 1.从事件对象向上查找事件回调
	const { capture, buddle } = collectPaths(
		currentElement,
		container,
		eventType
	);

	// 2.创建合成事件对象
	const sytheticEvent = createSytheticEvent(e);
	// 3.遍历capture
	triggerEventFlow(sytheticEvent, capture);
	// 4.遍历buddle
	if (!sytheticEvent.__stopPropagation) {
		triggerEventFlow(sytheticEvent, buddle);
	}
}

function collectPaths(
	currentElement: DOMElement,
	container: Container,
	eventType: string
) {
	const paths: Paths = {
		capture: [],
		buddle: []
	};

	while (currentElement && currentElement !== container) {
		const elementProps = currentElement[elementPropsKey];
		if (elementProps) {
			const eventCallbackName = getEventCallbackNameFormEventType(eventType);
			if (eventCallbackName) {
				eventCallbackName.forEach((callbackName, index) => {
					const callbackEvent = elementProps[callbackName];
					if (callbackEvent) {
						if (index === 0) {
							paths.capture.unshift(callbackEvent);
						} else {
							paths.buddle.push(callbackEvent);
						}
					}
				});
			}
		}
		currentElement = currentElement.parentNode as DOMElement;
	}

	return paths;
}

function getEventCallbackNameFormEventType(
	eventType: string
): string[] | undefined {
	return {
		click: ['onClickCapture', 'onClick']
	}[eventType];
}

function createSytheticEvent(e: Event) {
	const sytheticEvent = e as SytheticEvent;
	sytheticEvent.__stopPropagation = false;
	const originStopPropagation = e.stopPropagation;

	sytheticEvent.stopPropagation = () => {
		sytheticEvent.__stopPropagation = true;
		if (originStopPropagation) {
			originStopPropagation();
		}
	};

	return sytheticEvent;
}

function triggerEventFlow(
	sytheticEvent: SytheticEvent,
	eventCallback: EventCallback[]
) {
	for (let i = 0; i < eventCallback.length; i++) {
		const callback = eventCallback[i];
		callback(sytheticEvent);

		if (sytheticEvent.__stopPropagation) {
			return;
		}
	}
}
