#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const yargs = require('yargs');
const parseYarnLock = require('@yarnpkg/lockfile').parse;

// 解析命令行参数
const argv = yargs
    .usage('Usage: $0 [lock-file] [--add-sh]')
    .option('add-sh', {
        describe: 'Copy npmPublish.sh script to the modulestgz folder',
        type: 'boolean',
    })
    .help()
    .argv;

const currentWorkingDir = process.cwd();

// 检查文件是否存在
function fileExists(filePath) {
    return fs.existsSync(filePath);
}

// 获取锁文件路径
function getLockFilePath() {
    if (argv._[0]) {
        return path.join(currentWorkingDir, argv._[0]);
    } else {
        const packageLockPath = path.join(currentWorkingDir, 'package-lock.json');
        const yarnLockPath = path.join(currentWorkingDir, 'yarn.lock');

        if (fileExists(packageLockPath)) {
            return packageLockPath;
        } else if (fileExists(yarnLockPath)) {
            return yarnLockPath;
        } else {
            throw new Error('No supported lock file found. Make sure you have either package-lock.json or yarn.lock in your directory.');
        }
    }
}

// 读取 package-lock.json 或 yarn.lock 的 resolved，获取 tgz 包的 url
function getResolvedUrl(lockFilePath) {
    const fileContent = fs.readFileSync(lockFilePath, 'utf8');

    if (lockFilePath.endsWith('package-lock.json')) {
        const packageLock = JSON.parse(fileContent);
        const resolvedList = Object.values(packageLock.packages)
            .filter(pkg => pkg.resolved)
            .map(pkg => pkg.resolved);
        return resolvedList;
    } else if (lockFilePath.endsWith('yarn.lock')) {
        const yarnLock = parseYarnLock(fileContent);
        const resolvedList = Object.values(yarnLock.object)
            .filter(pkg => pkg.resolved)
            .map(pkg => pkg.resolved);
        return resolvedList;
    } else {
        throw new Error('Unsupported lock file format. Only package-lock.json and yarn.lock are supported.');
    }
}


// 下载文件
async function download(url, filePath) {
    return new Promise((resolve, reject) => {
        const fileName = path.basename(url);
        if (fs.existsSync(filePath)) {
            console.log(`File ${fileName} already exists in filelist folder. Skipping download.`);
            resolve();
            return;
        }

        const file = fs.createWriteStream(filePath);

        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`File ${fileName} downloaded successfully.`);
                resolve();
            });
        }).on('error', (error) => {
            console.error(`Error downloading file ${fileName}: ${error.message}`);
            reject(error);
        });
    });
}

// 通过tgz地址下载tgz包到本地的modulestgz文件夹下
async function getTgz(list) {
    const modulesDir = path.join(currentWorkingDir, 'modulestgz');
    if (!fs.existsSync(modulesDir)) {
        fs.mkdirSync(modulesDir);
    }

    for (const url of list) {
        const fileName = url.split('/').pop();
        const filePath = path.join(modulesDir, fileName);

        try {
            await download(url, filePath);
        } catch (error) {
            console.error(`Error downloading ${fileName}: ${error.message}`);
        }
    }
    return modulesDir;
}

function copyScript(targetPath) {
    const scriptName = 'npmPublish.sh';
    const sourcePath = path.join(__dirname, scriptName);
    if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, path.join(targetPath, scriptName));
        console.log(`Copied ${scriptName} to the modulestgz folder.`);
    } else {
        console.error(`Error: ${scriptName} not found in the package directory.`);
    }
}

async function main() {
    try {
        const lockFilePath = getLockFilePath();
        const list = getResolvedUrl(lockFilePath);
        console.log('Dependencies size:', list.length);

        const modulesDir = await getTgz(list);
        console.log('All dependencies have been processed.');

        if (argv['add-sh']) {
            copyScript(modulesDir);
        }
    } catch (error) {
        console.error(`Error in main function: ${error.message}`);
    }
}

main();
