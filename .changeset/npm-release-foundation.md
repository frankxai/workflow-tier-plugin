---
"@frankxai/workflow-tier": patch
---

Put the package on the estate npm release standard: changesets v3, OIDC trusted publishing with
automatic provenance, and a `verify` gate that packs the tarball and asserts what actually ships
(required entries, bin shebangs, no local-protocol dependencies, size budget, no release tooling
leaked to consumers).

**Breaking:** `engines.node` moves to `>=22` — the version this package is actually exercised on. CI
tests there, and the test runner glob positional that `pnpm test` relies on postdates Node 20.

This version exists to prove the trusted-publisher path end to end — `0.1.0` is published by hand
from the CI tarball because npm cannot attach a trusted publisher to a package that does not yet
exist; every release after it is signed by CI with no token anywhere.
