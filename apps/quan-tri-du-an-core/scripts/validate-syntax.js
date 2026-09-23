const fs = require('fs');
const path = require('path');
const vm = require('vm');

const appRoot = path.join(__dirname, '..');
const filesToValidate = [
  path.join(appRoot, 'public', 'SBSI_Master_Project_Portal.html'),
  path.join(appRoot, 'src', 'legacy', 'master-project-portal', 'body.html')
];

let hasErrors = false;

for (const filePath of filesToValidate) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[WARN] File not found to validate: ${filePath}`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let scriptIndex = 0;

  while ((match = scriptRegex.exec(content)) !== null) {
    const code = match[1].trim();
    if (!code) continue; // skip external src-only scripts
    scriptIndex++;
    try {
      new vm.Script(code, { filename: `${path.basename(filePath)}#script${scriptIndex}` });
      console.log(`[PASS] ${path.basename(filePath)} script #${scriptIndex} syntax OK (${code.length.toLocaleString()} chars)`);
    } catch (err) {
      hasErrors = true;
      console.error(`\n❌ [FATAL SYNTAX ERROR] in ${filePath} (script #${scriptIndex}):`);
      console.error(err.message);
      if (err.stack) console.error(err.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
}

if (hasErrors) {
  console.error('\n🚫 Validation FAILED: Critical JavaScript syntax errors detected! Build aborted.\n');
  process.exit(1);
} else {
  console.log('\n✅ All dashboard scripts validated with 100% clean syntax!\n');
  process.exit(0);
}
