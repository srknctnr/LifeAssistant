import { describe, expect, it } from 'vitest'

import {
  DEFAULT_CATEGORIES,
  mergeCategoryNames,
} from '@/features/budget/categories'

describe('mergeCategoryNames', () => {
  it('keeps defaults first and appends custom and used names', () => {
    const merged = mergeCategoryNames(['Evcil Hayvan'], ['Aidat', null])
    expect(merged.slice(0, DEFAULT_CATEGORIES.length)).toEqual(
      DEFAULT_CATEGORIES,
    )
    expect(merged).toContain('Evcil Hayvan')
    expect(merged).toContain('Aidat')
  })

  it('deduplicates Turkish case-insensitively', () => {
    const merged = mergeCategoryNames(['market', 'GİYİM'], ['giyim'])
    expect(
      merged.filter((n) => n.toLocaleLowerCase('tr') === 'market'),
    ).toHaveLength(1)
    expect(
      merged.filter((n) => n.toLocaleLowerCase('tr') === 'giyim'),
    ).toHaveLength(1)
  })

  it('ignores empty and whitespace-only names', () => {
    const merged = mergeCategoryNames([' '], [null, ''])
    expect(merged).toEqual(DEFAULT_CATEGORIES)
  })
})
