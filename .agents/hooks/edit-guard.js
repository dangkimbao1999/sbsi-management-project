/**
 * Antigravity Edit Guard Hook (PreToolUse matcher: write_to_file|replace_file_content)
 * Enforces branch safety, secret prevention, and error-handling standards.
 */
const fs = require('fs');
const { execSync } = require('child_process');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf-8');
  } catch {
    return '';
  }
}

function getCurrentBranch() {
  try {
    return execSync('git branch --show-current', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function isGitIgnored(filePath) {
  try {
    execSync(`git check-ignore -q "${filePath.replace(/"/g, '\\"')}"`, { stdio: ['pipe', 'pipe', 'ignore'] });
    return true; // Exit 0 means ignored
  } catch {
    return false; // Non-zero means not ignored
  }
}

function main() {
  const inputRaw = readStdin();
  if (!inputRaw.trim()) {
    console.log(JSON.stringify({ decision: 'allow' }));
    return;
  }

  let payload;
  try {
    payload = JSON.parse(inputRaw);
  } catch {
    console.log(JSON.stringify({ decision: 'allow' }));
    return;
  }

  const toolName = payload.toolCall?.name || '';
  const args = payload.toolCall?.args || {};
  const targetFile = args.TargetFile || args.file_path || '';
  const content = args.CodeContent || args.ReplacementContent || args.content || '';

  // 1. Branch check (Guard editing code directly on main/master)
  const branch = getCurrentBranch();
  if (branch === 'main' || branch === 'master') {
    const isDocFile = /(AGENTS\.md|CLAUDE\.md|GEMINI\.md|README\.md)$/i.test(targetFile);
    if (!isDocFile && targetFile) {
      console.log(JSON.stringify({
        decision: 'deny',
        reason: `Blocked by Antigravity branch guard: editing files directly on '${branch}' is not allowed. Switch to a feature branch (feat/...) first. (Documentation files like AGENTS.md / README.md are exempt).`
      }));
      return;
    }
  }

  // 2. Private key / Credential check
  if (/(id_rsa|private_key|\.pem)$/i.test(targetFile) || /-----BEGIN (RSA )?PRIVATE KEY-----/i.test(content)) {
    console.log(JSON.stringify({
      decision: 'deny',
      reason: 'Blocked by Antigravity secrets guard: writing private keys or credential material into the repository is strictly forbidden.'
    }));
    return;
  }

  // 3. Unignored .env check
  if (/\.env($|\.)/i.test(targetFile)) {
    if (!isGitIgnored(targetFile)) {
      console.log(JSON.stringify({
        decision: 'deny',
        reason: `Blocked by Antigravity secrets guard: '${targetFile}' is a .env file that is NOT gitignored. Add it to .gitignore first or document variables in .env.example.`
      }));
      return;
    }
  }

  // 4. Empty catch block check
  if (/catch\s*\([^)]*\)\s*\{\s*\}/i.test(content)) {
    console.log(JSON.stringify({
      decision: 'deny',
      reason: 'Blocked by Antigravity code quality guard: empty catch blocks hide real runtime failures. Provide explicit error logging or handling.'
    }));
    return;
  }

  // 5. Silent fallback language check
  if (/silently\s+(ignore|fallback|continue)/i.test(content)) {
    console.log(JSON.stringify({
      decision: 'deny',
      reason: 'Blocked by Antigravity code quality guard: silent fallback pattern detected. Provide explicit error handling.'
    }));
    return;
  }

  console.log(JSON.stringify({ decision: 'allow' }));
}

main();
