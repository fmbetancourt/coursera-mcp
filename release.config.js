export default {
  branches: [
    'main',
    { name: 'develop', prerelease: 'beta', channel: 'beta' },
  ],
  tagFormat: 'v${version}',
  repositoryUrl: 'https://github.com/fmbetancourt/coursera-mcp.git',
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
        changelogTitle: '# Changelog\n\nAll notable changes to this project will be documented in this file.',
      },
    ],
    [
      '@semantic-release/npm',
      {
        npmPublish: true,
        tarballDir: 'dist',
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json', 'package-lock.json'],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
    [
      '@semantic-release/github',
      {
        releasedLabels: ['released'],
        successComment: '🎉 This issue/PR is included in version ${nextRelease.version}',
        failComment: 'Release failed. Check workflow logs at https://github.com/fmbetancourt/coursera-mcp/actions',
      },
    ],
  ],
};
