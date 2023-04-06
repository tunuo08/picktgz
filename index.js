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
        const resolvedList = Object.entries(packageLock.packages)
            .filter(([_, pkg]) => pkg.resolved)
            .map(([pkgPath, pkg]) => {
                const pkgName = getFileName(pkgPath, pkg)
                return [pkgName, pkg.resolved]
            });
        return resolvedList;
    } else if (lockFilePath.endsWith('yarn.lock')) {
        const yarnLock = parseYarnLock(fileContent);
        const resolvedList = Object.entries(yarnLock.object)
            .filter(([_, pkg]) => pkg.resolved)
            .map(([pkgPath, pkg]) => {
                const pkgName = getFileName(pkgPath, pkg, true)
                return [pkgName, pkg.resolved]
            });
        return resolvedList;
    } else {
        throw new Error('Unsupported lock file format. Only package-lock.json and yarn.lock are supported.');
    }
}

// 获取文件名称
function getFileName(pkgPath, pkg, fromYarn = false) {
    let pkgName = pkgPath.split('node_modules/').pop();
    pkgName = pkgName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
    if (fromYarn) {
        const regex = /(.*)@/;
        pkgName = regex.test(pkgName) ? pkgName.match(regex)[1] : pkgName;
    }
    const pkgVersion = pkg.version;
    return `${pkgName}-${pkgVersion}.tgz`;
}

// 下载文件
async function download(url, filePath, pkgName) {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(filePath)) {
            console.log(`File ${pkgName} already exists in filelist folder. Skipping download.`);
            resolve();
            return;
        }
        const file = fs.createWriteStream(filePath);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`File ${pkgName} downloaded successfully.`);
                resolve();
            });
        }).on('error', (error) => {
            console.error(`Error downloading file ${pkgName}: ${error.message}`);
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
    let totalDownloaded = 0;
    const totalSize = list.length;
    for (const [pkgName, pkgUrl] of list) {
        const filePath = path.join(modulesDir, pkgName);
        try {
            await download(pkgUrl, filePath, pkgName);
            totalDownloaded++;
            console.log(`[${totalDownloaded}/${totalSize}] Downloaded ${pkgName}`);
        } catch (error) {
            console.error(`Error downloading ${pkgName}: ${error.message}`);
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