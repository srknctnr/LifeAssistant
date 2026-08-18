import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/dom'

// The route smoke tests mount lazily-loaded pages, so the first assertion in a
// cold run waits on a chunk import as well as a render. The 1s default made
// those tests flake on a slow machine; the tests themselves are unchanged.
configure({ asyncUtilTimeout: 5000 })
