const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const DEFAULT_MANIFEST_PATH = path.join('mobile', 'release-integrity.json');

function gitBlobId(content) {
  const source = Buffer.isBuffer(content) ? content : Buffer.from(content);
  // These protected files are UTF-8 text. Match Git's text clean filter so a
  // Windows CRLF checkout hashes to the same committed blob as its LF source.
  const bytes = Buffer.from(source.toString('utf8').replace(/\r\n/gu, '\n'));
  const header = Buffer.from(`blob ${bytes.length}\0`);
  return crypto.createHash('sha1').update(header).update(bytes).digest('hex');
}

function resolveRepositoryPath(repositoryRoot, relativePath) {
  const normalizedRoot = path.resolve(repositoryRoot);
  const resolvedPath = path.resolve(normalizedRoot, relativePath);
  const relativeToRoot = path.relative(normalizedRoot, resolvedPath);
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    throw new Error(`La ruta de integridad sale del repositorio: ${relativePath}`);
  }
  return resolvedPath;
}

function readManifest(repositoryRoot, manifestRelativePath = DEFAULT_MANIFEST_PATH) {
  const manifestPath = resolveRepositoryPath(repositoryRoot, manifestRelativePath);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Falta el manifiesto versionado de integridad: ${manifestRelativePath}`);
  }

  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`No se pudo leer el manifiesto de integridad: ${error.message}`);
  }
}

function assertManifestShape(manifest) {
  if (manifest?.manifestVersion !== 1) {
    throw new Error('El manifiesto de integridad debe usar manifestVersion 1.');
  }
  if (!/^[0-9a-f]{40}$/u.test(manifest.baselineCommit || '')) {
    throw new Error('El manifiesto de integridad no contiene un baselineCommit válido.');
  }
  if (!manifest.catalog || typeof manifest.catalog !== 'object') {
    throw new Error('El manifiesto de integridad no contiene el catálogo agregado.');
  }
  if (!Array.isArray(manifest.requiredReleaseIdentityFiles) || manifest.requiredReleaseIdentityFiles.length === 0) {
    throw new Error('El manifiesto no protege los archivos de identidad de versión y commit.');
  }
}

function verifyBaseline(repositoryRoot, baselineCommit) {
  const result = spawnSync(
    'git',
    ['-C', repositoryRoot, 'merge-base', '--is-ancestor', baselineCommit, 'HEAD'],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(
      `El commit actual no contiene el baseline completo ${baselineCommit.slice(0, 7)}.`
      + (detail ? ` ${detail}` : ''),
    );
  }
}

function verifyFileBlob(repositoryRoot, descriptor, label, violations) {
  if (!descriptor?.path || !/^[0-9a-f]{40}$/u.test(descriptor.expectedGitBlob || '')) {
    violations.push(`El manifiesto tiene una entrada inválida para ${label}.`);
    return null;
  }

  const absolutePath = resolveRepositoryPath(repositoryRoot, descriptor.path);
  if (!fs.existsSync(absolutePath)) {
    violations.push(`Falta ${label}: ${descriptor.path}`);
    return null;
  }

  const content = fs.readFileSync(absolutePath);
  const actualBlob = gitBlobId(content);
  if (actualBlob !== descriptor.expectedGitBlob) {
    violations.push(
      `${label} cambió de contenido (Git blob ${actualBlob}; se esperaba ${descriptor.expectedGitBlob}).`,
    );
  }
  return content;
}

function verifyCatalog(repositoryRoot, catalog, violations) {
  const content = verifyFileBlob(repositoryRoot, catalog, 'el catálogo agregado de Preview', violations);
  if (!content) return;

  let lessons;
  try {
    lessons = JSON.parse(content.toString('utf8'));
  } catch (error) {
    violations.push(`El catálogo agregado no contiene JSON válido: ${error.message}`);
    return;
  }

  if (!Array.isArray(lessons)) {
    violations.push('El catálogo agregado debe ser una lista de lecciones.');
    return;
  }

  if (lessons.length !== catalog.lessonCount) {
    violations.push(
      `El catálogo contiene ${lessons.length} lecciones; debe conservar ${catalog.lessonCount} lecciones.`,
    );
  }

  const countsByUnit = lessons.reduce((counts, lesson) => {
    const unitId = lesson?.unit_id;
    counts.set(unitId, (counts.get(unitId) || 0) + 1);
    return counts;
  }, new Map());
  const expectedUnits = Object.entries(catalog.lessonsByUnit || {});
  if (countsByUnit.size !== catalog.unitCount || expectedUnits.length !== catalog.unitCount) {
    violations.push(
      `El catálogo contiene ${countsByUnit.size} unidades; debe conservar ${catalog.unitCount} unidades.`,
    );
  }
  for (const [unitId, expectedCount] of expectedUnits) {
    const actualCount = countsByUnit.get(unitId) || 0;
    if (actualCount !== expectedCount) {
      violations.push(`${unitId} contiene ${actualCount} lecciones; debe conservar ${expectedCount}.`);
    }
  }

  const unexpectedUnits = [...countsByUnit.keys()].filter((unitId) => !(unitId in (catalog.lessonsByUnit || {})));
  if (unexpectedUnits.length > 0) {
    violations.push(`El catálogo contiene unidades inesperadas: ${unexpectedUnits.join(', ')}.`);
  }
}

function verifyReleaseIdentity(repositoryRoot, files, violations) {
  for (const descriptor of files) {
    const content = verifyFileBlob(
      repositoryRoot,
      descriptor,
      'el archivo requerido de identidad de versión y commit',
      violations,
    );
    if (!content) continue;

    const source = content.toString('utf8');
    for (const marker of descriptor.requiredMarkers || []) {
      if (!source.includes(marker)) {
        violations.push(`Falta el marcador de identidad "${marker}" en ${descriptor.path}.`);
      }
    }
  }
}

function verifyReleaseIntegrity({
  repositoryRoot,
  manifestRelativePath = DEFAULT_MANIFEST_PATH,
  verifyGitBaseline = true,
}) {
  const manifest = readManifest(repositoryRoot, manifestRelativePath);
  assertManifestShape(manifest);

  const violations = [];
  verifyCatalog(repositoryRoot, manifest.catalog, violations);
  verifyReleaseIdentity(repositoryRoot, manifest.requiredReleaseIdentityFiles, violations);

  if (violations.length > 0) {
    throw new Error(`Integridad de Preview inválida:\n- ${violations.join('\n- ')}`);
  }
  if (verifyGitBaseline) verifyBaseline(repositoryRoot, manifest.baselineCommit);

  return manifest;
}

function parseRepositoryRoot(argv) {
  const index = argv.indexOf('--repository-root');
  if (index < 0 || !argv[index + 1]) return path.resolve(__dirname, '..', '..');
  return path.resolve(argv[index + 1]);
}

if (require.main === module) {
  try {
    const repositoryRoot = parseRepositoryRoot(process.argv.slice(2));
    const manifest = verifyReleaseIntegrity({ repositoryRoot });
    console.log(
      `Integridad verificada: ${manifest.catalog.lessonCount} lecciones, `
      + `${manifest.catalog.unitCount} unidades, baseline ${manifest.baselineCommit.slice(0, 7)}.`,
    );
  } catch (error) {
    console.error(`Publicación bloqueada: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  gitBlobId,
  verifyReleaseIntegrity,
};
