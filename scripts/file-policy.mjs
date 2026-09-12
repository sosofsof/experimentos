import path from 'node:path';

const publicExtensions = new Set([
  '.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg',
  '.avif', '.ico', '.woff', '.woff2', '.ttf', '.otf',
]);
const privateSegment = /^(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?|\.npmrc|\.netrc|\.ssh|\.aws|\.config|\.wrangler|auth(?:\..*)?|credentials?(?:\..*)?|secrets?(?:\..*)?|sessions?(?:\..*)?|cookies?(?:\..*)?|logs?|backups?|dumps?|acesso-privado.*)$/i;
const privateExtension = /\.(?:log|sqlite\d?|db)(?:-.*)?$|\.(?:pem|key|p12|pfx|har|bak|backup|zip|tar|gz|7z)$/i;

export function isPrivatePath(file) {
  return file.split(/[\\/]/).some(segment => privateSegment.test(segment)) || privateExtension.test(file);
}

export function isPublicFile(file) {
  return !isPrivatePath(file) && !file.split(/[\\/]/).some(segment => segment.startsWith('.'))
    && publicExtensions.has(path.extname(file).toLowerCase());
}
