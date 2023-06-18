import path from 'path';
import fs from 'fs';
import ts from 'rollup-plugin-typescript2';
import cjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';

export const pckPath = path.resolve(__dirname, '../../packages');
export const pckDistPath = path.resolve(__dirname, '../../dist/node_modules');

export const resolvePckPath = (pckName, isDist) => {
	if (isDist) {
		return `$pckDistPath/${pckName}`;
	} else {
		return `$pckPath/${pckName}`;
	}
};

export const getPckJson = (pckName) => {
	const paths = `${pckPath}/${pckName}/package.json`;
	const str = fs.readFileSync(paths, 'utf8');
	return JSON.parse(str);
};

export const getBasePlugins = (
	alias = {
		__DEV__: true
	},
	{ typescript = {} } = {}
) => {
	return [replace(alias), cjs(), ts(typescript)];
};
