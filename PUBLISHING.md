# Publishing to npm

This package is automatically published to npm via GitHub Actions when version tags are pushed, using **npm Trusted Publishing** (no tokens required!).

## One-Time Setup (Already Complete! ✅)

The initial setup has been completed:

1. ✅ npm account created
2. ✅ First manual publish done (v0.1.0)
3. ⏳ Configure Trusted Publishing (do this next!)

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

Two workflows are configured:

### CI Workflow (`.github/workflows/ci.yml`)

- Runs on every push to `main`
- Runs on every pull request
- Executes type checking, tests, and build

### Publish Workflow (`.github/workflows/publish.yml`)

- Runs only when version tags are pushed (e.g., `v0.1.0`)
- Executes full CI checks
- Publishes to npm on success
