/**
 * Simple script to add a standard JSDoc snippet referencing the global
 * `InternalError` OpenAPI response to controller files that don't already
 * include it. This helps swagger-jsdoc pick up the shared response.
 *
 * Usage: `node scripts/add-internalerror-jsdoc.js`
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const ROOT = path.resolve(__dirname, '..');
const PATTERN = path.join(ROOT, 'src', 'modules', '**', '*controller.ts');

const JSDOC_SNIPPET = `/**\n * @openapi\n * responses:\n *   InternalError:\n *     $ref: '#/components/responses/InternalError'\n */\n\n`;

const files = glob.sync(PATTERN, { nodir: true });
let modified = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes("#/components/responses/InternalError") || content.includes('InternalError:')) {
    continue;
  }

  // Prepend the snippet at top of file
  fs.writeFileSync(file, JSDOC_SNIPPET + content, 'utf8');
  modified += 1;
  console.log('Updated JSDoc in', file.replace(ROOT + '/', ''));
}

console.log(`Done. Updated ${modified} files.`);
