import { window, workspace } from "vscode";
import { dataDirErrorMessage, getTypstDir } from "./packageManage";
import * as fs from 'fs';
import simpleGit from 'simple-git';

// error message
const syncRepoErrorMessage = 'Can not find syncRepo, please make sure you have configured syncRepo.';

export function getSyncRepo() {
  if (workspace.getConfiguration().has('vscode-typst-sync.syncRepo')) {
    return workspace.getConfiguration().get('vscode-typst-sync.syncRepo') as string;
  }
  return '';
}

export async function getSyncRepoGit() {
  // 1. get syncRepo
  const syncRepo = getSyncRepo();
  if (!syncRepo) {
    window.showErrorMessage(syncRepoErrorMessage);
    return;
  }
  // 2. if typstDir not exist, create it
  const typstDir = getTypstDir();
  if (!typstDir) {
    window.showErrorMessage(dataDirErrorMessage);
    return;
  }
  try {
    await fs.promises.access(typstDir);
  } catch (err) {
    await fs.promises.mkdir(typstDir, { recursive: true });
  }
  // 3. if .git not exist, init it
  const git = simpleGit(typstDir);
  if (!(await git.checkIsRepo())) {
    await git.init();
  }
  // 4. add remote, if remote exist and is not the same, ask
  const originRemotes = (await git.getRemotes(true)).filter(remote => remote.name === 'origin');
  const originRemote = originRemotes.length > 0 ? originRemotes[0] : null;
  if (originRemote && originRemote.refs.fetch !== syncRepo) {
    const answer = await window.showQuickPick(['Yes', 'No'], {
      placeHolder: 'Remote origin already exists, do you want to replace it?'
    });
    if (answer === 'Yes') {
      await git.removeRemote('origin');
      await git.addRemote('origin', syncRepo);
    }
  }
  if (!originRemote) {
    await git.addRemote('origin', syncRepo);
  }
  // 5. return git
  return git;
}

export async function pushRepo(message: string) {
  // 1. get syncRepo git
  const git = await getSyncRepoGit();
  if (!git) {
    return;
  }
  // 2. get current branch
  const currentBranch = await git.branchLocal();
  // 3. git add all files to stage
  await git.add('.');
  // 4. git commit with timestamp, if there are changes
  const status = await git.status();
  if (status.files.length !== 0) {
    const timestamp = new Date().toISOString();
    await git.commit(timestamp);
  }
  // 5. git pull and keep all local changes (merge strategy)
  try {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    await git.pull('origin', currentBranch.current);
  } catch (err) {
    // ignore
  }
  // 6. git push
  await git.push('origin', currentBranch.current);
  // 7. info
  window.showInformationMessage(message);
}

export async function pullRepo(message: string) {
  // 1. get syncRepo git
  const git = await getSyncRepoGit();
  if (!git) {
    return;
  }
  // 2. get current branch
  const currentBranch = await git.branchLocal();
  // 3. git pull and keep all remote changes (merge strategy)
  // eslint-disable-next-line @typescript-eslint/naming-convention
  await git.pull('origin', currentBranch.current);
  // 4. info
  window.showInformationMessage(message);
}