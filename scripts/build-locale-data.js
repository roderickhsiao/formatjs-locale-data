const { minify } = require('terser');
const cp = require('copy-concurrently');
const del = require('del');
const fs = require('fs');
const makeDir = require('make-dir');
const path = require('path');
const recursive = require('recursive-readdir');

const packageName = process.env.PACKAGE_NAME;

const basePath = path.resolve(__dirname, '..', 'packages', packageName);
const localeDataFolder = path.resolve(basePath, 'locale-data');
const patches = path.resolve(basePath, 'patches');
const tempFolder = path.resolve(basePath, 'temp');

const localeData = path.resolve(
  basePath,
  'node_modules',
  '@formatjs',
  packageName,
  'locale-data'
);

const minifyCode = async file => {
  const { code } = await minify(`${file}`);
  return code;
};

const processFile = async () => {
  console.log(
    'Start processing package',
    packageName
  );
  // 1. clean up
  console.log('1.', 'Clean up folder');
  await del([tempFolder], [localeData]);

  // 2. move files
  console.log('2.', 'Move locale data');
  await Promise.all([
    cp(localeData, tempFolder),
    cp(patches, tempFolder)
  ]).catch(e => console.log(e));

  console.log('3.', 'Create folder');
  await makeDir(path.resolve(basePath, 'locale-data'));

  console.log('4.', 'Minify locale data');
  const ignoreFunc = file => {
    return !file.includes('.js');
  };

  await recursive(tempFolder, [ignoreFunc], async (err, files) => {
    const minifyEachFile = async file => {
      // only minify js file
      const localeFile = fs.readFileSync(`${file}`, 'utf-8');
      const minifiedCode = await minifyCode(localeFile);
      fs.writeFileSync(
        `${file.replace('/temp/', '/locale-data/')}`,
        minifiedCode
      );
    };

    const minifyProcesses = files.map(minifyEachFile);

    await Promise.all(minifyProcesses);
  });

  console.log('5.', 'Minify Completed');

  console.log(
    'Complete processing package',
    packageName
  );
};

processFile();
