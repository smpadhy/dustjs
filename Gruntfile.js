module.exports = function(grunt) {
  //--------------------------------------------------
  //------------Project config------------------------
  //--------------------------------------------------
  var pkg = grunt.file.readJSON('package.json');
  grunt.initConfig({
    // Metadata.
    pkg: pkg,
    banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %>\n' +
      '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
      '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
      ' Released under the <%= pkg.license %> License */\n',
    // Task configuration.
    peg: {
      parser: {
        src: 'src/dust.pegjs',
        dest: 'lib/parser.js',
        options: {
          wrapper: function(src, parser) {
            var buildMsg = 'Do not edit this file directly. It is automatically generated from src/dust.pegjs';
            var wrapper = grunt.file.read("src/umdParserWrapper.js").replace('@@build', buildMsg).split('@@parser');
            return wrapper[0] + parser + wrapper[1];
          }
        }
      }
    },
    execute: {
      testRhino: {
        src: 'node_modules/.bin/rhino*',
        options: {
          args: ['-f', 'test/rhino.spec.js']
        }
      },
      buildParser: {
        src: 'src/build.js'
      }
    },
    concat: {
      options: {
        banner: '<%= banner %>',
        stripBanners: true
      },
      core: {
        src: ['lib/dust.js', 'src/amd-core.js'],
        dest: 'tmp/dust-core.js'
      },
      full: {
        src: ['lib/dust.js', 'lib/parser.js', 'lib/compiler.js', 'src/amd-full.js'],
        dest: 'tmp/dust-full.js'
      }
    },
    copy: {
      core: {
        src: 'tmp/dust-core.js',
        dest: 'dist/dust-core.js'
      },
      coreMin: {
        src: 'tmp/dust-core.min.js',
        dest: 'dist/dust-core.min.js'
      },
      full: {
        src: 'tmp/dust-full.js',
        dest: 'dist/dust-full.js'
      },
      fullMin: {
        src: 'tmp/dust-full.min.js',
        dest: 'dist/dust-full.min.js'
      },
      license: {
        src: 'LICENSE',
        dest: 'dist/'
      }
    },
    uglify: {
      options: {
        banner: '<%= banner %>',
        mangle: {
          except: ['require', 'define', 'module', 'dust']
        }
      },
      core: {
        src: '<%= concat.core.dest %>',
        dest: 'tmp/dust-core.min.js'
      },
      full: {
        src: '<%= concat.full.dest %>',
        dest: 'tmp/dust-full.min.js'
      }
    },
    clean: {
      build: ['tmp/*'],
      dist: ['dist/*']
    },
    jshint: {
      options: {
        jshintrc: true
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      libs: {
        src: ['lib/**/*.js', '!lib/parser.js'] // don't hint the parser which is autogenerated from pegjs
      }
    },
    connect: {
     testServer: {
       options: {
         port: 3000,
         keepalive: false
       }
     }
    },
    jasmine: {
      options: {
        keepRunner: false,
        display: 'short',
        specs: ['test/templates/all.js', 'test/helpers/template.helper.js', 'test/templates.spec.js'],
        vendor: ['node_modules/ayepromise/ayepromise.js', 'test/lib/highland.js']
      },
      /*tests production (minified) code*/
      testProd: {
        src: 'tmp/dust-full.min.js'
      },
      /*tests unminified code, mostly used for debugging by `grunt dev` task*/
      testDev : {
        src: 'tmp/dust-full.js'
      },
      /*runs unit tests with jasmine and collects test coverage info via istanbul template
      * tests unminified version of dust to make sure test coverage starts are correctly calculated
      * istanbul jumbles source code in order to record coverage, so this task is not suited for
      * debugging while developing. Use jasmine:testClient instead, which runs on unminified code
      * and can be easily debugged*/
      coverage : {
        src: 'tmp/dust-full.js',
        options: {
          display: 'none',
          template: require('grunt-template-jasmine-istanbul'),
          templateOptions: {
            coverage: 'tmp/coverage/coverage.json',
            report: 'tmp/coverage',
            thresholds: {
              lines: 82,
              statements: 82,
              branches: 70,
              functions: 85
            }
          }
        }
      }
    },
    jasmine_nodejs: {
      options: {
        useHelpers: true,
        reporters: {
          console: {
            colors: false,
            verbosity: 0
          }
        }
      },
      core: {
        specs: ['test/core.spec.js']
      },
      cjs: {
        specs: ['test/commonJS.spec.js']
      },
      dustc: {
        helpers: ['test/cli/matchers.helper.js'],
        specs: ['test/cli/*']
      },
      templates: {
        specs: ['test/templates.spec.js']
      }
    },
    watch: {
      lib: {
        files: ['<%= jshint.libs.src %>'],
        tasks: ['clean:build', 'buildLib']
      },
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      lib_test: {
        files: ['<%= jshint.libs.src %>', '<%= jasmine.options.specs %>'],
        tasks: ['testPhantom']
      }
    },
    bump: {
      options: {
        files: ['package.json', 'bower.json', 'lib/dust.js'],
        updateConfigs: ['pkg'],
        push: false,
        commitFiles: ['-a']
      }
    },
    log: {
      coverage: {
        options: {
          message: 'Open <%=jasmine.coverage.options.templateOptions.report%>/index.html in a browser to view the coverage.'
        }
      },
      copyForRelease: {
        options: {
          message: 'OK. Done copying version <%= pkg.version %> build from tmp to dist'
        }
      },
      testClient: {
        options: {
        message: 'Open http://localhost:<%= connect.testServer.options.port %>/_SpecRunner.html in a browser\nCtrl + C to stop the server.'
        }
      },
      release: {
        options: {
          message: ['OK. Done bumping, adding, committing, tagging and pushing the new version',
                    '',
                    'You still need to manually do the following:',
                    '  * git push upstream && git push upstream --tags',
                    '  * npm publish'].join('\n')
        }
      }
    },
    githubChanges: {
      dist: {
        options: {
          owner: "linkedin",
          repository: "dustjs",
          tagName: "v<%= pkg.version %>",
          onlyPulls: true,
          useCommitBody: true,
          auth: true
        }
      }
    }
  });

  //--------------------------------------------------
  //------------Custom tasks -------------------------
  //--------------------------------------------------
  grunt.registerMultiTask('log', 'Print some messages', function() {
    grunt.log.ok(this.data.options.message);
  });

  //--------------------------------------------------
  //------------External tasks -----------------------
  //--------------------------------------------------
  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-execute');
  grunt.loadNpmTasks('grunt-peg');
  grunt.loadNpmTasks('grunt-jasmine-nodejs');
  grunt.loadNpmTasks('grunt-github-changes');

  //--------------------------------------------------
  //------------Grunt task aliases -------------------
  //--------------------------------------------------
  grunt.registerTask('buildLib',       ['jshint:libs', 'concat']);
  grunt.registerTask('build',          ['clean:build', 'peg', 'buildLib', 'uglify']);

  //test tasks
  grunt.registerTask('testNode',       ['jasmine_nodejs:templates', 'jasmine_nodejs:core', 'jasmine_nodejs:cjs']);
  grunt.registerTask('testRhino',      ['build', 'execute:testRhino']);
  grunt.registerTask('testPhantom',    ['build', 'jasmine:testProd']);
  grunt.registerTask('testCli',        ['jasmine_nodejs:dustc']);
  grunt.registerTask('test',           ['build', 'jasmine:testProd', 'testCli', 'testNode', 'execute:testRhino', 'jasmine:coverage']);

  //decide whether to run all tests or just the Node tests for Travis CI
  grunt.registerTask('travis',         (process.env.TEST === 'all') ? ['test'] : ['testNode', 'testCli']);

  //task for debugging in browser
  grunt.registerTask('dev',            ['build', 'jasmine:testDev:build', 'connect:testServer','log:testClient', 'watch:lib']);

  //task to run unit tests on client against prod version of code
  grunt.registerTask('testClient',     ['build', 'jasmine:testProd:build', 'connect:testServer', 'log:testClient', 'watch:lib_test']);

  //coverage report
  grunt.registerTask('coverage',       ['build', 'jasmine:coverage', 'log:coverage']);

  //release tasks
  grunt.registerTask('copyForRelease', ['clean:dist', 'copy', 'log:copyForRelease']);
  grunt.registerTask('buildRelease',   ['test', 'githubChanges', 'copyForRelease']);
  grunt.registerTask('releasePatch',   ['bump-only:patch', 'buildRelease', 'bump-commit', 'log:release']);
  grunt.registerTask('releaseMinor',   ['bump-only:minor', 'buildRelease', 'bump-commit', 'log:release']);
  // major release should probably be done with care
  //grunt.registerTask('releaseMajor',   ['bump-only:major', 'buildRelease', 'bump-commit:major', 'log:release']);

  //default task - full test
  grunt.registerTask('default',        ['test']);
};
