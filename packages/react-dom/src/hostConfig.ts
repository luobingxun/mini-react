import { FiberNode } from 'react-reconciler/src/fiber';
import { HostComponent, HostText } from 'react-reconciler/src/workTags';
import type { Props } from 'shared/ReactTypes';
import { FunctionComponent } from '../../react-reconciler/src/workTags';
import { updateFiberProps } from './sytheticEvent';

export type Container = Element;
export type Instance = Element;
export type TextInstance = Text;

export function createInstance(type: string, props: Props): Instance {
	const instance = document.createElement(type);
	updateFiberProps(instance, props);
	return instance;
}

export function appendInintialChild(parent: Instance, child: Instance) {
	parent.appendChild(child);
}

export function createTextInstance(content: string) {
	return document.createTextNode(content);
}

export function appenChildIntoContainer(container: Instance, child: Instance) {
	container.appendChild(child);
}

export function removeChild(contaner: Instance, child: Instance) {
	contaner.removeChild(child);
}

export function commitUpdate(finishedWork: FiberNode) {
	const tag = finishedWork.tag;
	switch (tag) {
		case HostText:
			const newContent = finishedWork.peddingProps.content;
			return commitTextUpdate(finishedWork.stateNode, newContent);
		case HostComponent:
		case FunctionComponent:
		default:
			if (__DEV__) {
				console.warn('commitUpdate方法未实现的更新', finishedWork);
			}
	}
}

function commitTextUpdate(textInstance: TextInstance, content: string) {
	textInstance.textContent = content;
}
