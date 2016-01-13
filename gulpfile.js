// Include gulp
var gulp = require('gulp');

// Include Our Plugins
var addStream     = require('add-stream');
var concat        = require('gulp-concat');
var concatCss     = require('gulp-concat-css');
var rename        = require('gulp-rename');
var sourceMaps    = require('gulp-sourcemaps');
var templateCache = require('gulp-angular-templatecache');
var ts            = require('gulp-typescript');
var tslint        = require('gulp-tslint');
var uglify        = require('gulp-uglify');
var sass          = require('gulp-sass');
var cssNano     = require('gulp-cssnano');

// Lint Task
gulp.task('lint', function() {
    return gulp.src('src/components/**/*.ts')
        .pipe(tslint())
        .pipe(tslint.report('default'));
});

// Concatenate & Minify JS
gulp.task('scripts', function() {
    return gulp.src('src/components/**/*.ts')
        .pipe(addStream.obj(prepareTemplates()))
        .pipe(sourceMaps.init())
        .pipe(ts({
            noImplicitAny: true,
            suppressImplicitAnyIndexErrors: true,
            out: 'explorer-rock-properties-components.js'
        }))
        .pipe(gulp.dest('dist'))
        .pipe(rename('explorer-rock-properties-components.min.js'))
        .pipe(uglify())
        .pipe(sourceMaps.write('.'))
        .pipe(gulp.dest('dist'));
});

// Watch Files For Changes
gulp.task('watch', function() {
    // We'll watch JS, SCSS and HTML files.
    gulp.watch('src/components/**/*(*.ts|*.html)', ['lint', 'scripts']);
	gulp.watch('src/templates/*.html', ['lint', 'scripts']);
    gulp.watch('src/scss/*.scss', ['sass', 'concatCss', 'cssNano']);
});

gulp.task('sass', function () {
	gulp.src('src/scss/*.scss')
		.pipe(sass().on('error', sass.logError))
		.pipe(gulp.dest('src/css'));
});

gulp.task('concatCss', ['sass'], function () {
    return gulp.src('src/css/*.css')
        .pipe(concatCss("explorer-rock-properties-components.css"))
        .pipe(gulp.dest('dist'));
});

gulp.task('cssNano', ['sass', 'concatCss'], function() {
	gulp.src('dist/explorer-rock-properties-components.css')
		.pipe(cssNano())
		.pipe(rename({suffix: '.min'}))
		.pipe(gulp.dest('dist'));
});

gulp.task('resources', function () {
    return gulp.src('src/resources/**/*')
        .pipe(gulp.dest('dist/resources'));
});

// Default Task
gulp.task('default', ['lint', 'scripts', 'sass', 'concatCss', 'cssNano', 'resources', 'watch']);

function prepareTemplates() {
   return gulp.src('src/templates/**/*.html')
      .pipe(templateCache('templates.ts',{root:"rockprops", module:"explorer.rockproperties.templates", standalone : true,
       templateHeader:'angular.module("<%= module %>"<%= standalone %>).run(["$templateCache", function($templateCache:any) {'}));
}

