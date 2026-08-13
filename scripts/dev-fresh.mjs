#!/usr/bin/env node
// Wrapper around `astro dev` that hard-restarts the server on any change
// under src/ or public/. Astro 6 + Vite HMR can leave stale CSS in the
// SSR module cache after `.astro` <style> edits — non-WebSocket clients
// (curl, fresh tabs that win the race against the reload signal) then
// see the old styles. Restarting on every relevant change is slower but
// guarantees the next request renders against the current source.
//
// Usage: node scripts/dev-fresh.mjs  (also wired as `npm run dev:fresh`)
//
// Env passthrough: DISABLE_PAGEFIND, ASTRO_HOST, ASTRO_PORT.
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import chokidar from 'chokidar';

// Loopback by default. Set ASTRO_HOST=0.0.0.0 to reach the server from another
// machine (a container host, a phone on the same network); that is an explicit
// opt-in rather than the default, so a dev server is not exposed by accident.
const HOST = process.env.ASTRO_HOST || '127.0.0.1';
// Deliberately not 4321: this wrapper is for running alongside a normal
// `npm run dev`, and sharing its port would make one of the two fail to bind.
const PORT = process.env.ASTRO_PORT || '4123';
const DEBOUNCE_MS = 250;

const projectRoot = resolve(import.meta.dirname, '..');
const watchDirs = ['src', 'public', 'astro.config.mjs', 'uno.config.ts'].map((p) =>
  resolve(projectRoot, p),
);

let child = null;
let restartTimer = null;
let restarting = false;
let pendingRestart = false;

function spawnAstro() {
  // Spawn the astro CLI directly via node, not through `npx` or the shell
  // shim. `npx` creates a node-sh-node chain; SIGTERM to the parent doesn't
  // propagate, leaving the real astro orphaned (PPID=1) and still bound to
  // the port. Then the "restarted" instance falls back to a different port
  // and the original (stale) server keeps serving requests on 4123.
  // Spawning the CLI directly + `detached: true` lets us signal the whole
  // process group cleanly.
  console.log(`[dev-fresh] starting astro dev on ${HOST}:${PORT}`);
  const astroCli = resolve(projectRoot, 'node_modules/astro/bin/astro.mjs');
  child = spawn(process.execPath, [astroCli, 'dev', '--host', HOST, '--port', PORT], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env },
    detached: true,
  });
  child.on('exit', (code, signal) => {
    const exited = child;
    child = null;
    if (restarting) {
      restarting = false;
      spawnAstro();
      if (pendingRestart) {
        pendingRestart = false;
        scheduleRestart('coalesced change during restart');
      }
    } else if (code !== 0 && signal !== 'SIGTERM' && signal !== 'SIGINT' && exited) {
      console.error(`[dev-fresh] astro exited unexpectedly (code=${code}, signal=${signal})`);
      process.exit(code || 1);
    }
  });
}

function killChildTree(signal) {
  if (!child) return;
  try {
    // negative pid → signal the whole process group (detached: true gave us
    // a fresh group rooted at the child's pid)
    process.kill(-child.pid, signal);
  } catch (err) {
    if (err.code !== 'ESRCH') throw err;
  }
}

function restartNow(reason) {
  if (restarting) {
    pendingRestart = true;
    return;
  }
  if (!child) {
    spawnAstro();
    return;
  }
  console.log(`[dev-fresh] restarting astro dev (${reason})`);
  restarting = true;
  killChildTree('SIGTERM');
  // safety: if the child group doesn't exit cleanly in 5s, SIGKILL it
  setTimeout(() => {
    if (restarting && child) {
      console.warn('[dev-fresh] astro did not exit in 5s, sending SIGKILL to group');
      killChildTree('SIGKILL');
    }
  }, 5000);
}

function scheduleRestart(reason) {
  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => restartNow(reason), DEBOUNCE_MS);
}

// Chokidar instead of node:fs.watch because Node's recursive fs.watch on
// Linux is unreliable for editor "atomic-rename" writes (after the rename
// replaces the inode, the watch on the old inode is silently lost and
// subsequent edits never fire). Chokidar rebinds watches per rename.
//
// `usePolling: true` matters whenever the checkout is a bind-mounted directory
// inside a container: inotify events don't reliably propagate across the mount
// boundary. Polling uses periodic stat() calls instead, which work regardless of
// mount type. Vite's own watcher dodges this because it polls under the hood;
// vanilla chokidar has to opt in.
//
// The ignore filter is a function, not the common `/(^|[\\/])\../` regex from
// chokidar's examples. That regex matches a dot segment ANYWHERE in the path, so
// a checkout that sits under a hidden parent directory matches on the parent and
// chokidar silently watches nothing. Testing only the basename ignores dotfiles
// without caring where the project lives.
const ignoredPath = (p) => {
  const base = p.split(/[\\/]/).pop();
  if (!base) return false;
  if (base.startsWith('.')) return true; // dotfiles & dirs by basename
  if (base.endsWith('~') || base.endsWith('.swp')) return true;
  if (/\.tmp\.\d+\./.test(base)) return true; // editor atomic-rename temps
  return false;
};

const watcher = chokidar.watch(watchDirs, {
  ignored: ignoredPath,
  ignoreInitial: true,
  usePolling: true,
  interval: 400,
  binaryInterval: 1000,
  awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 30 },
});

watcher.on('all', (_event, path) => {
  scheduleRestart(path.split(/[\\/]/).slice(-2).join('/'));
});

watcher.on('ready', () => {
  const watched = watcher.getWatched();
  const dirCount = Object.keys(watched).length;
  console.log(`[dev-fresh] chokidar ready; ${dirCount} dirs watched`);
});

watcher.on('error', (err) => {
  console.error(`[dev-fresh] watcher error: ${err.message}`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`\n[dev-fresh] received ${sig}, shutting down`);
    if (child) child.kill('SIGTERM');
    process.exit(0);
  });
}

spawnAstro();
