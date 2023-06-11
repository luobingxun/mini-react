import { getPckJson, pckDistPath, pckPath, getBasePlugins } from './utils';
import generatePackageJson from 'rollup-plugin-generate-package-json';

const { name, module } = getPckJson('react');

export default [
	{
		input: `${pckPath}/${name}/${module}`,
		output: {
			file: `${pckDistPath}/${name}/index.js`,
			name: 'index.js',
			format: 'umd'
		},
		plugins: [
			...getBasePlugins(),
			generatePackageJson({
				inputFolder: `${pckPath}/${name}`,
				outputFolder: `${pckDistPath}/${name}`,
				baseContents: ({ name, module, description, version }) => {
					return {
						name,
						module,
						description,
						version
					};
				}
			})
		]
	},
	{
		input: `${pckPath}/${name}/src/jsx.ts`,
		output: [
			{
				file: `${pckDistPath}/${name}/jsx-runtime.js`,
				name: 'jsx-runtime.js',
				format: 'umd'
			},
			{
				file: `${pckDistPath}/${name}/jsx-dev-runtime.js`,
				name: 'jsx-dev-runtime.js',
				format: 'umd'
			}
		],
		plugins: getBasePlugins()
	}
];
