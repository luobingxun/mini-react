import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbol';
import { Key, Props, ReactElementType, Ref, Type } from 'shared/ReactTypes';

function ReactElement(
	type: Type,
	key: Key,
	ref: Ref,
	props: Props
): ReactElementType {
	const element = {
		$$typeof: REACT_ELEMENT_TYPE,
		type,
		key,
		ref,
		props,
		__mark: 'miniReact'
	};

	return element;
}

export function jsx(
	type: Type,
	config: Props,
	...maybeChildren: any[]
): ReactElementType {
	let key: Key = null;
	let ref: Ref = null;
	const props: Props = {};

	for (const prop in config) {
		if (prop === 'key' && config[prop] !== undefined) {
			key = config[prop];
			continue;
		}
		if (prop === 'ref' && config[prop] !== undefined) {
			ref = config[prop];
			continue;
		}
		if (Object.hasOwnProperty.call(config, prop)) {
			props[prop] = config[prop];
		}
	}

	const maybeChildrenLength = maybeChildren.length;
	if (maybeChildrenLength === 1) {
		props.children = maybeChildren[1];
	} else {
		props.children = maybeChildren;
	}

	return ReactElement(type, key, ref, props);
}

export function jsxDEV(type: Type, config: Props): ReactElementType {
	let key: Key = null;
	let ref: Ref = null;
	const props: Props = {};

	for (const prop in config) {
		if (prop === 'key' && config[prop] !== undefined) {
			key = config[prop];
			continue;
		}
		if (prop === 'ref' && config[prop] !== undefined) {
			ref = config[prop];
			continue;
		}
		if (Object.hasOwnProperty.call(config, prop)) {
			props[prop] = config[prop];
		}
	}

	return ReactElement(type, key, ref, props);
}
