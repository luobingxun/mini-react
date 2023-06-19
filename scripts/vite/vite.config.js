import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import replace from '@rollup/plugin-replace';
import { resolvePckPath } from '../rollup/utils';
import path from 'path';

export default defineConfig({
	plugins: [
		react(),
		replace({
			__DEV__: true,
			preventAssignment: true
		})
	],
	resolve: {
		alias: [
			{
				find: 'react',
				replacement: resolvePckPath('react')
			},
			{
				find: 'react-dom',
				replacement: resolvePckPath('react-dom')
			},
			{
				find: 'hostConfig',
				replacement: path.resolve(
					resolvePckPath('react-dom'),
					'./src/hostConfig.ts'
				)
			}
		]
	}
});
