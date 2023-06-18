import type { Props } from 'shared/ReactTypes';

export type Container = Element;
export type Instance = Element;

export function createInstance(type: string, props: Props): Instance {
	return document.createElement(type);
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
