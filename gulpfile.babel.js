import gulp from 'gulp';
import fs from 'fs';
import git from 'git-rev-sync';
import util from 'gulp-util';
import rename from 'gulp-rename';
import size from 'gulp-filesize';
import shell from 'gulp-shell';
import notify from 'gulp-notify';
import gulpif from 'gulp-if';
import filter from 'gulp-filter';
import gulpwatch from 'gulp-watch';
import yargs from 'yargs';
import browserSync from 'browser-sync';

// CSS
import sourceMaps from 'gulp-sourcemaps';
import sass from 'gulp-sass';
import postCss from 'gulp-postcss';
import autoprefixer from 'autoprefixer';
import pxtorem from 'postcss-pxtorem';
import cachebuster from 'postcss-pxtorem';
import cssnano from 'gulp-cssnano';

// JS
import rollup from 'gulp-better-rollup';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import uglify from 'rollup-plugin-uglify';
import alias from 'rollup-plugin-alias';
import replace from 'rollup-plugin-replace';
import strip from 'rollup-plugin-strip';
import jshint from 'gulp-jshint';
import rootImport from 'rollup-plugin-root-import';

const project = JSON.parse(fs.readFileSync('./package.json'));
const bs = browserSync.create();
const argv = yargs.argv;
const clientName = project.name;
const projectName = clientName.toLowerCase();
const url = project.homepage;

/*
	PostCSS processors
*/
const processors = {
	prod: [
		pxtorem({rootValue: 16, replace: true, mediaQuery: true}),
        cachebuster({cssPath: '/assets', type:'mtime'})
	],
	dev: [
        autoprefixer(),
        pxtorem({rootValue: 16, replace: true, mediaQuery: true}),
        cachebuster({cssPath: '/assets', type:'mtime'})
	]
};

/*
	Helpers
*/

function getEnv(branch) {
	if (branch === 'master') { return 'production'; }
	if (branch.includes('release')) { return 'staging'; }
	return 'development';
}

function handleSassError(err){
	util.log(util.colors.bold.white.bgRed('\n \n [SASS] ERROR \n'));
	console.error('', err.message);
	return notify({
		title: 'Sass Error',
		message: `Error on line ${ err.line } of ${ err.file }`
	}).write(err);
}

function uploadFile(file) {
	const environment = getEnv(git.branch());
	argv.upload ? console.log(`Uploading to: ${ environment }`) : '';

	return shell(['theme upload <%= f(file.path) %> -v'], {
		templateData: {
			f: function (s) {
			  return  `--env=${ environment } ${ s.replace(process.cwd() + '/', '') }`;
			}
		},
		verbose: true
    });
}

/*
	Styles
*/

function stylesDev() {
	const environment = getEnv(git.branch());
	console.log(`Uploading to: ${ environment }`);

	util.log(util.colors.green('Compiling SCSS'));
	return gulp.src('src/scss/*.scss')
		.pipe(sourceMaps.init())
		.pipe(sass().on('error', handleSassError))
		.pipe(postCss(processors.dev))
		.pipe(sourceMaps.write())
		.pipe(rename(`${ projectName }.min.css`))
		.pipe(gulp.dest('assets/'))
		.pipe(size())
		.pipe(shell(['theme upload <%= f(file.path) %> -v'], {
			templateData: {
				f: function (s) {
				  return  `--env=${ environment } ${ s.replace(process.cwd() + '/', '') }`;
				}
			},
			verbose: true
	    }))
		.pipe(bs.stream())
		.pipe(notify({ title: clientName + ' CSS', message: 'CSS Refreshed' }));
}

function stylesBuild() {
	util.log(util.colors.green('Minifying CSS'));
	return gulp.src('src/scss/*.scss')
		.pipe(sass().on('error', handleSassError))
		.pipe(postCss(processors.dev))
		.pipe(cssnano({autoprefixer: { add: true }}))
		.pipe(rename(projectName + '.min.css'))
		.pipe(size())
		.pipe(gulp.dest('assets/'))
		.pipe(gulpif(argv.upload, uploadFile()))
}

/*
	Scripts
*/

function scriptsDev() {
	const environment = getEnv(git.branch());
	console.log(`Uploading to: ${ environment }`);

	util.log(util.colors.blue('Concatenating JS '));

	return gulp.src('./src/js/main.js')
		.pipe(rollup({
			plugins: [
				resolve({
					preferBuiltins: false
				}),
				commonjs(),
				rootImport({
			    	root: `${ __dirname }/src/js`,
			    	useEntry: 'prepend',
			    	extensions: '.js'
			    }),
				alias({
					'@vue': 'node_modules/vue/dist/vue.esm.js',
					'@axios': 'node_modules/axios-es6/dist/axios.min.js',
					'@algoliasearchlite': 'node_modules/algoliasearch/dist/algoliasearchLite.min.js'
				}),
				replace({
					'process.env.NODE_ENV': JSON.stringify('development')
				}),
				babel({
					exclude: 'node_modules/**',
					presets: [['env', {
						modules: false
					}]],
					babelrc: false,
					plugins: ['external-helpers']
				})
			]
		}, {
			format: 'iife',
			sourceMap: true
		}))
        .on('error', function(e) {
        	util.log(util.colors.red('Babel error >>>'));
			console.log(e);
			util.log(util.colors.red('Babel error >>>'));
			this.emit('end');
		})
		.pipe(rename(`${ projectName }.min.js`))
		.pipe(gulp.dest('assets/'))
		.pipe(size())
		.pipe(shell(['theme upload <%= f(file.path) %> -v'], {
			templateData: {
				f: function (s) {
				  return  `--env=${ environment } ${ s.replace(process.cwd() + '/', '') }`;
				}
			},
			verbose: true
	    }))
	    .pipe(bs.stream())
	    .pipe(notify({ title: clientName + ' JS', message: 'Browser Refreshed' }));
}

function scriptsBuild() {
	util.log(util.colors.blue('Uglifying JS '));

	return gulp.src('./src/js/main.js')
		.pipe(rollup({
			plugins: [
				resolve({
					preferBuiltins: false
				}),
				commonjs(),
				rootImport({
			    	root: `${ __dirname }/src/js`,
			    	useEntry: 'prepend',
			    	extensions: '.js'
			    }),
				alias({
					'@vue': 'node_modules/vue/dist/vue.min.js',
					'@axios': 'node_modules/axios-es6/dist/axios.min.js',
					'@algoliasearchlite': 'node_modules/algoliasearch/dist/algoliasearchLite.min.js'
				}),
				replace({
					'process.env.NODE_ENV': JSON.stringify('development')
				}),
				babel({
					exclude: 'node_modules/**',
					presets: [['env', {
						modules: false
					}]],
					babelrc: false,
					plugins: ['external-helpers']
				}),
				strip({
					debugger: true,
					functions: ['console.log', 'assert.*', 'debug', 'alert'],
					sourceMap: true
				}),
				uglify()
			]
		}, {
			format: 'iife',
			sourceMap: false
		}))
        .on('error', function(e) {
        	util.log(util.colors.red('Babel error >>>'));
			console.log(e);
			util.log(util.colors.red('Babel error >>>'));
			this.emit('end');
		})
		.pipe(rename(`${ projectName }.min.js`))
		.pipe(gulp.dest('assets/'))
		.pipe(size())
		.pipe(gulpif(argv.upload, uploadFile()));
};

/*
	Files (liquid, assets. Everything not js and css)
*/
var watchSrc = ['assets/**/*', '!assets/*.js', '!assets/*.css', '!assets/.DS_Store', 'layout/**/*.*', 'sections/**/*.*', 'snippets/**/*.*', 'templates/**/*.*', 'config/*.*', 'locales/*.*'];

function fileUpload() {
	const environment = getEnv(git.branch());
	console.log(`Uploading to: ${ environment }`);

	gulp.src(watchSrc)
		.pipe(gulpwatch(watchSrc))
		.pipe(filter(file => file.event === 'change' || file.event === 'add'))
		.pipe(shell(['theme upload <%= f(file.path) %> -v'], {
			templateData: {
				f: function (s) {
				  return  `--env=${ environment } ${ s.replace(process.cwd() + '/', '') }`;
				}
			},
			verbose: true
	    }))
		.pipe(bs.stream({injectChanges: false}))
		.pipe(notify({ title: 'File Uploaded', message: 'Browser Refreshed' }));
};

function fileDelete() {
	const environment = getEnv(git.branch());
	console.log(`Uploading to: ${ environment }`);

	gulp.src(watchSrc)
		.pipe(gulpwatch(watchSrc))
		.pipe(filter(file => file.event === 'unlink'))
		.pipe(shell(['theme remove <%= f(file.path) %> -v'], {
			templateData: {
				f: function (s) {
				  return  `--env=${ environment } ${ s.replace(process.cwd() + '/', '') }`;
				}
			},
			verbose: true
	    }))
		.pipe(bs.stream({injectChanges: false}))
		.pipe(notify({ title: 'File Uploaded', message: 'Browser Refreshed' }));
};

/*
	Linting
*/

function scriptsHint() {
	util.log(util.colors.blue('Validating JS '));
	return gulp.src(['src/js/**/*.js', '!src/js/libs/**/*.js', '!src/js/legacy/*.js'])
 		.pipe(jshint({
 			esversion: 6
 		}))
		.pipe(notify((file) => {
			if (file.jshint.success) {
				return false;
			}
			return `${ file.relative } has errors!`;
		}))
		.pipe(jshint.reporter('jshint-stylish', { verbose: true }));
};

/*
	Exports
*/
export function watch() {
	gulp.parallel(scriptsDev, scriptsHint)();
	gulp.parallel(stylesDev)();

	fs.readFile('config.yml', 'utf-8', function(err, _data) {
		// it's magic, just go with it.
		const themeId =  /development:(\n+)[^#](\s+)theme_id:(\s+)([0-9]+)/.exec(_data)[4];

		bs.init({
		    proxy: `${ url }?preview_theme_id=${ themeId }`,
		    open: false,
		    xip: false, // turn this on if using typekit, point your typekit to xip.io
		    ghostMode: { // turn this off if you don't want other people scrolling on you
		        clicks: true,
		        forms: true,
		        scroll: true
		    }
		});
	});

	gulp.parallel(fileUpload, fileDelete)();
	gulp.watch('src/js/**/*.js', gulp.parallel(scriptsDev, scriptsHint));
	gulp.watch('src/scss/**/*.scss', stylesDev);
}

export function build(done) {
	stylesBuild();
	scriptsBuild();

	const message = argv.upload ? 'Minified and uploaded' : 'Minified';
	notify({ title: clientName + ' CSS & JS', message: message })
	done();
}

export default watch;
