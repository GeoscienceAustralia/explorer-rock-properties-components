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
    // We watch both JS and HTML files.
    gulp.watch('src/components/**/*(*.ts|*.html)', ['lint', 'scripts']);
	gulp.watch('src/templates/*.html', ['lint', 'scripts']);
    gulp.watch('src/css/*.css', ['concatCss']);
    //gulp.watch('scss/*.scss', ['sass']);
});

gulp.task('concatCss', function () {
    return gulp.src('src/css/**/*.css')
        .pipe(concatCss("explorer-rock-properties-components.css"))
        .pipe(gulp.dest('dist/'));
});

gulp.task('resources', function () {
    return gulp.src('src/resources/**/*')
        .pipe(gulp.dest('dist/resources'));
});

// Default Task
gulp.task('default', ['lint', 'scripts', 'concatCss', 'resources', 'watch']);

function prepareTemplates() {
   return gulp.src('src/templates/**/*.html')
      .pipe(templateCache('templates.ts',{root:"rockprops", module:"explorer.rockproperties.templates", standalone : true,
       templateHeader:'angular.module("<%= module %>"<%= standalone %>).run(["$templateCache", function($templateCache:any) {'}));
}

