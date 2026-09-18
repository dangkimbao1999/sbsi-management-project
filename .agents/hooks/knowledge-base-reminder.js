/**
 * Antigravity Knowledge Base Reminder Hook (Stop event)
 * Reminds agent to update app-specific AGENTS.md before ending if apps/ has uncommitted modifications.
 */
const { execSync } = require('child_process');

function main() {
  try {
    const status = execSync("git status --porcelain -- apps/", { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    const changed = status.split('\n').filter(line => line.trim() && !line.includes('AGENTS.md') && !line.includes('CLAUDE.md'));

    if (changed.length > 0) {
      console.log(JSON.stringify({
        decision: 'allow',
        reason: 'Knowledge-base reminder: apps/ has modified files. Ensure relevant apps/<app>/AGENTS.md is updated to preserve architectural context for the next session.'
      }));
      return;
    }
  } catch {
    // Ignore git errors
  }

  console.log(JSON.stringify({ decision: 'allow' }));
}

main();
