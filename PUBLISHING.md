# Publishing to npm

This package is automatically published to npm via GitHub Actions when version tags are pushed.

## One-Time Setup

### 1. Create an npm Account

If you don't have one already, create an account at [npmjs.com](https://www.npmjs.com/).

### 2. Generate an npm Token

1. Log in to [npmjs.com](https://www.npmjs.com/)
2. Go to your profile → Access Tokens
3. Click "Generate New Token"
4. Choose **"Automation"** type (for CI/CD)
5. Copy the generated token

### 3. Add Token to GitHub

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `NPM_TOKEN`
5. Value: Paste your npm token
6. Click "Add secret"

## Publishing a New Version

### Update the Version

Use npm's built-in version command to bump the version in `package.json` and create a git tag:

```bash
# For a patch release (0.1.0 → 0.1.1)
npm version patch

# For a minor release (0.1.0 → 0.2.0)
npm version minor

# For a major release (0.1.0 → 1.0.0)
npm version major
```

This command will:

- Update the version in `package.json`
- Create a git commit with the message "X.Y.Z"
- Create a git tag `vX.Y.Z`

### Push to GitHub

```bash
# Push the commit and tag together
git push origin main --follow-tags
```

### Automated Process

Once the tag is pushed, GitHub Actions will automatically:

1. ✅ Run type checking (`npm run typecheck`)
2. ✅ Run tests (`npm test`)
3. ✅ Build the package (`npm run build`)
4. ✅ Publish to npm with provenance

You can monitor the progress in the "Actions" tab of your GitHub repository.

### NPM Provenance

The package is published with [npm provenance](https://docs.npmjs.com/generating-provenance-statements), which provides:

- Cryptographic proof of where the package was built
- A link back to the exact commit and workflow
- A verification badge on the npm package page

## Manual Publishing (Not Recommended)

If you need to publish manually for some reason:

```bash
# Ensure you're logged in
npm login

# Build the package
npm run build

# Publish
npm publish --access public
```

Note: Manual publishing won't include provenance attestation.

## Troubleshooting

### "You must verify your email to publish packages"

Log in to npmjs.com and verify your email address.

### "You do not have permission to publish"

- Ensure you're logged in to the correct npm account
- Check that the package name isn't already taken
- Verify the `NPM_TOKEN` secret is correctly set in GitHub

### "npm ERR! 403 Forbidden"

- The package name might be taken
- Your npm token might be expired or invalid
- You might not have 2FA configured (required for publishing)

## CI/CD Workflows

Two workflows are configured:

### CI Workflow (`.github/workflows/ci.yml`)

- Runs on every push to `main`
- Runs on every pull request
- Executes type checking, tests, and build

### Publish Workflow (`.github/workflows/publish.yml`)

- Runs only when version tags are pushed (e.g., `v0.1.0`)
- Executes full CI checks
- Publishes to npm on success
