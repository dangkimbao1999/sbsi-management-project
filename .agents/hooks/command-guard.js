/**
 * Antigravity Command Guard Hook (PreToolUse matcher: run_command)
 * Blocks destructive or hazardous commands from executing.
 */
const fs = require('fs');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf-8');
  } catch {
    return '';
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
  const commandLine = payload.toolCall?.args?.CommandLine || '';

  if (toolName === 'run_command' || toolName === 'Bash' || toolName === 'execute_command') {
    // 1. Destructive git reset
    if (/git\s+reset\s+--hard/i.test(commandLine)) {
      console.log(JSON.stringify({
        decision: 'deny',
        reason: 'Blocked by Antigravity command guard: destructive git reset (--hard) is forbidden.'
      }));
      return;
    }

    // 2. Destructive git clean
    if (/git\s+clean\s+-fdx/i.test(commandLine)) {
      console.log(JSON.stringify({
        decision: 'deny',
        reason: 'Blocked by Antigravity command guard: destructive git clean (-fdx) is forbidden.'
      }));
      return;
    }

    // 3. Root filesystem deletion
    if (/rm\s+-rf\s+\//i.test(commandLine)) {
      console.log(JSON.stringify({
        decision: 'deny',
        reason: 'Blocked by Antigravity command guard: recursive delete from filesystem root is forbidden.'
      }));
      return;
    }

    // 4. Destructive infrastructure deletion
    if (/(terraform|pulumi)\s+destroy/i.test(commandLine)) {
      console.log(JSON.stringify({
        decision: 'deny',
        reason: 'Blocked by Antigravity command guard: destructive infrastructure destroy is forbidden.'
      }));
      return;
    }

    // 5. Reading local .env secrets via shell cat/type
    if (/(cat|type|Get-Content)\s+.*\.env(\.[a-zA-Z0-9_.-]+)?(\s|$)/i.test(commandLine)) {
      console.log(JSON.stringify({
        decision: 'deny',
        reason: 'Blocked by Antigravity command guard: reading raw .env secrets via terminal output is forbidden.'
      }));
      return;
    }
  }

  console.log(JSON.stringify({ decision: 'allow' }));
}

main();
