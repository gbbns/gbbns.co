'use strict'

import gulp from 'gulp'
import del from 'del'
import runSequence from 'run-sequence'
import gulpLoadPlugins from 'gulp-load-plugins'
import { spawn } from "child_process"
import tildeImporter from 'node-sass-tilde-importer'
import hash from 'gulp-hash'
import postcss from 'gulp-postcss'
import reporter from 'postcss-reporter'
import syntax_scss from 'postcss-scss'
import stylelint from 'stylelint'
import critical from'critical'
import autoprefixer from 'autoprefixer'
import lost from 'lost'

const $ = gulpLoadPlugins()
const browserSync = require('browser-sync').create()
const isProduction = process.env.NODE_ENV === 'production'

const onError = (err) => {
    console.log(err)
}

// --
critical.generate({
	base: "test/",
	src: "index.html",
	dest: "styles/main.css",
	width: 1300,
	height: 900
});

gulp.task("critical", ["build"], function(cb) {
	critical.generate({
		inline: true,
		base: "dist/",
		src: "index.html",
		dest: "dist/index-critical.html",
		width: 320,
		height: 480,
		minify: true
	});
});



gulp.task('server', ['build'], () => {
    gulp.start('init-watch')
	$.watch(['archetypes/**/*', 'data/**/*', 'content/**/*', 'layouts/**/*', 'static/**/*', 'config.toml'], () => gulp.start('hugo'))
	$.watch('src/scss/**/*.scss', () => gulp.start('sass'))
	$.watch('src/js/**/*.js', () => gulp.start('js-watch'))
	$.watch('src/images/**/*', () => gulp.start('images'))
});

gulp.task('server:with-drafts', ['build-preview'], () => {
    gulp.start('init-watch')
    $.watch(['archetypes/**/*', 'data/**/*', 'content/**/*', 'layouts/**/*', 'static/**/*', 'config.toml'], () => gulp.start('hugo-preview'))
});

gulp.task('init-watch', () => {
    browserSync.init({
        server: {
            baseDir: 'public'
        },
        open: false
    })
    $.watch('src/scss/**/*.scss', () => gulp.start('sass'))
    $.watch('src/js/**/*.js', () => gulp.start('js-watch'))
    $.watch('src/images/**/*', () => gulp.start('images'))
})

gulp.task('build', () => {
    runSequence(['sass', 'js', 'fonts', 'images', 'pub-delete'], 'hugo')
})

gulp.task('build-preview', () => {
    runSequence(['sass', 'js', 'fonts', 'images', 'pub-delete'], 'hugo-preview')
})

gulp.task('hugo', (cb) => {
    let baseUrl = process.env.NODE_ENV === 'production' ? process.env.URL : process.env.DEPLOY_PRIME_URL;
    let args = baseUrl ? ['-b', baseUrl] : [];

    return spawn('hugo', args, { stdio: 'inherit' }).on('close', (code) => {
        browserSync.reload()
        cb()
    })
})

gulp.task('hugo-preview', (cb) => {
    let args = ['--buildDrafts', '--buildFuture'];
    if (process.env.DEPLOY_PRIME_URL) {
        args.push('-b')
        args.push(process.env.DEPLOY_PRIME_URL)
    }
    return spawn('hugo', args, { stdio: 'inherit' }).on('close', (code) => {
        browserSync.reload()
        cb()
    })
})

// --

gulp.task('sass', () => {
	var plugins = [
		autoprefixer({
			browsers: ['ie >= 10', 'last 2 versions']
		}),
		lost()
	];
    var processors = [
        stylelint('.stylelintrc'),
        reporter({
            clearMessages: true,
            console: false
        })
    ];

    del(["static/css/**/*"])

    return gulp.src([
        'src/scss/**/*.scss'
    ])
    .pipe($.plumber({ errorHandler: onError }))
    .pipe($.print())
	.pipe($.sass({ precision: 5, importer: tildeImporter, outputStyle: 'compressed'}))
	.pipe(postcss(plugins, processors, {
		syntax: syntax_scss
	}))
    .pipe(gulp.dest('static/css'))
    .pipe(browserSync.stream());
})

gulp.task('js-watch', ['js'], (cb) => {
    browserSync.reload();
    cb();
});

gulp.task('js', () => {
    return gulp.src([
        'src/js/**/*.js'
    ])
    .pipe($.plumber({ errorHandler: onError }))
    .pipe($.print())
    .pipe($.babel())
    .pipe($.concat('app.js'))
    .pipe($.if(isProduction, $.uglify()))
    .pipe($.size({ gzip: true, showFiles: true }))
    .pipe(gulp.dest('static/js'))
})

gulp.task('fonts', () => {
    return gulp.src('src/fonts/**/*.{woff,woff2}')
        .pipe(gulp.dest('static/fonts'));
});

gulp.task('images', () => {
    return gulp.src('src/images/**/*.{png,jpg,jpeg,gif,svg,webp,ico}')
        .pipe($.newer('static/images'))
        .pipe($.print())
        .pipe($.imagemin())
        .pipe(gulp.dest('static/images'));
});


gulp.task('pub-delete', () => {
    return del(['public/**', '!public'], {
      // dryRun: true,
      dot: true
    }).then(paths => {
      console.log('Files and folders deleted:\n', paths.join('\n'), '\nTotal Files Deleted: ' + paths.length + '\n');
    })
})
