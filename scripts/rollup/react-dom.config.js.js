import { getPckJson, pckDistPath, pckPath, getBasePlugins } from './utils';
import generatePackageJson from 'rollup-plugin-generate-package-json';
import alias from '@rollup/plugin-alias';

const { name, module } = getPckJson('react-dom');

export default [
	{
		input: `${pckPath}/${name}/${module}`,
		output: [
			{
				file: `${pckDistPath}/${name}/index.js`,
				name: 'index.js',
				format: 'umd'
			},
			{
				file: `${pckDistPath}/${name}/client.js`,
				name: 'client.js',
				format: 'umd'
			}
		],
		plugins: [
			...getBasePlugins(),
			alias({
				entries: {
					hostConfig: `${pckPath}/${name}/src/hostConfig.ts`
				}
			}),
			generatePackageJson({
				inputFolder: `${pckPath}/${name}`,
				outputFolder: `${pckDistPath}/${name}`,
				baseContents: ({ name, module, description, version }) => {
					return {
						name,
						module,
						description,
						version,
						dependencies: {
							react: version
						},
						main: 'index.js'
					};
				}
			})
		]
	}
];
