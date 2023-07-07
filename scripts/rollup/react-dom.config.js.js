import { getPckJson, pckDistPath, pckPath, getBasePlugins } from './utils';
import generatePackageJson from 'rollup-plugin-generate-package-json';
import alias from '@rollup/plugin-alias';

const { name, module, peerDependencies } = getPckJson('react-dom');

export default [
	{
		input: `${pckPath}/${name}/${module}`,
		output: [
			{
				file: `${pckDistPath}/${name}/index.js`,
				name: 'ReactDOM',
				format: 'umd'
			},
			{
				file: `${pckDistPath}/${name}/client.js`,
				name: 'client',
				format: 'umd'
			}
		],
		internal: [...Object.keys(peerDependencies)],
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
				baseContents: ({ name, description, version }) => {
					return {
						name,
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
	},
	{
		input: `${pckPath}/${name}/test-utils.ts`,
		output: [
			{
				file: `${pckDistPath}/${name}/test-utils.js`,
				name: 'ReactTestUtils',
				format: 'umd'
			}
		],
		external: ['react-dom'],
		plugins: getBasePlugins()
	}
];
