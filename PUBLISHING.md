# Publishing to npm

This package is automatically published to npm via GitHub Actions when version tags are pushed, using **npm Trusted Publishing** (no tokens required!).

## One-Time Setup (Already Complete! ✅)

The initial setup has been completed:

1. ✅ npm account created
2. ✅ Package published (current version: v0.3.0)
3. ⏳ Configure Trusted Publishing (if not already done)

### Configure Trusted Publishing

To enable automatic publishing from GitHub Actions:

1. Go to [npmjs.com](https://www.npmjs.com/) and log in
2. Navigate to your `fluent-convex` package page
3. Click **Settings** → **Publishing Access**
4. Under "Trusted publishers", click **"Add provider"**
5. Fill in the form:
   - **Provider:** GitHub Actions
   - **Repository owner:** `mikecann`
   - **Repository name:** `fluent-convex`
   - **Workflow filename:** `publish.yml`
   - **Environment name:** (leave blank)
6. Click **"Add"**

That's it! No secrets, no tokens needed. GitHub Actions will authenticate directly with npm using OIDC.

## Publishing a New Version

### Update the Version

Use npm's built-in version command to bump the version in the package's `package.json` and create a git tag:

```bash
# Navigate to the package directory
cd packages/fluent-convex

# For a patch release (0.3.0 → 0.3.1)
npm version patch

# For a minor release (0.3.0 → 0.4.0)
npm version minor

# For a major release (0.3.0 → 1.0.0)
npm version major
```

This command will:

- Update the version in `packages/fluent-convex/package.json`
- Create a git commit with the message "X.Y.Z"
- Create a git tag `vX.Y.Z`

**Note:** Make sure you're in the `packages/fluent-convex` directory when running `npm version`, as that's where the actual package's `package.json` is located.

### Push to GitHub

```bash
# Push the commit and tag together
git push origin main --follow-tags
```

### Automated Process

Once the tag is pushed, GitHub Actions will automatically:

1. ✅ Install dependencies from the committed lockfile (`npm ci --ignore-scripts`)
2. ✅ Run type checking (`npm run typecheck`)
3. ✅ Run tests (`npm test`)
4. ✅ Build and pack the package (`npm pack`, which runs `prepack`)
5. ✅ Publish that tarball to npm with provenance, from a separate job

The `build` job installs dependencies and runs the checks, but has no publish rights. Only the `publish` job can get an npm OIDC token, and it doesn't check out the repo or install anything: it downloads the tarball from the `build` job and publishes it. It uses a pinned npm version (Trusted Publishing needs npm 11.5.1 or later).

You can monitor the progress in the "Actions" tab of your GitHub repository.

### NPM Provenance

The package is published with [npm provenance](https://docs.npmjs.com/generating-provenance-statements), which provides:

- Cryptographic proof of where the package was built
- A link back to the exact commit and workflow
- A verification badge on the npm package page

## Manual Publishing (Emergency Use Only)

If you need to publish manually (e.g., CI is down):

```bash
# Ensure you're logged in
npm login

# Build the package
npm run build

# Publish
npm publish --access public
```

**Note:** Manual publishing won't include provenance attestation, which is a security feature that shows where the package was built.

## Troubleshooting

### "You must verify your email to publish packages"

Log in to npmjs.com and verify your email address.

### "You do not have permission to publish"

- Ensure you're logged in to the correct npm account
- Verify that Trusted Publishing is properly configured on npmjs.com
- Check the repository owner and name match exactly

### "npm ERR! 403 Forbidden"

- The package name might be taken
- Trusted Publishing configuration might be incorrect
- You might not have permissions on the npm package

### GitHub Actions publish fails

- Verify Trusted Publishing is configured on npmjs.com
- Check that the workflow filename is exactly `publish.yml`
- Ensure the `id-token: write` permission is set in the workflow
- Look at the detailed error message in the GitHub Actions log

## CI/CD Workflows

Three workflows are configured. All of them install with `npm ci` from the committed `package-lock.json`, so commit lockfile changes along with dependency changes. Actions are pinned to commit SHAs.

### CI Workflow (`.github/workflows/ci.yml`)

- Runs on every push to `main`
- Runs on every pull request
- Executes type checking, tests, and build

### Publish Workflow (`.github/workflows/publish.yml`)

- Runs only when version tags are pushed (e.g., `v0.1.0`)
- Executes full CI checks and packs the tarball (`build` job)
- Publishes that tarball to npm on success (`publish` job)

### Deploy Docs Workflow (`.github/workflows/deploy-docs.yml`)

- Runs on every push to `main`
- Deploys the `apps/docs` Convex backend and static site

### Lockfile and platform packages

npm has a [bug](https://github.com/npm/cli/issues/4828) where updating an existing lockfile can drop optional platform packages such as `@rollup/rollup-linux-x64-gnu`. If CI fails with `Cannot find module @rollup/rollup-linux-x64-gnu`, regenerate the lockfile from scratch and commit it:

```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules package-lock.json
npm install
```
