import { describe, it, expect, beforeEach } from 'vitest'
import { extractAccessibilityTree } from '../AccessibilityTreeExtractor.js'

function buildDom(html: string): Element {
  const div = document.createElement('div')
  div.innerHTML = html
  document.body.appendChild(div)
  return div
}

describe('AccessibilityTreeExtractor', () => {
  let container: Element

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  describe('extractAccessibilityTree', () => {
    it('extractAccessibilityTree_heading_rendersWithText', () => {
      container = buildDom('<h2>My Portfolio</h2>')

      const result = extractAccessibilityTree(container)

      expect(result).toContain('h2 "My Portfolio"')
    })

    it('extractAccessibilityTree_button_rendersWithLabel', () => {
      container = buildDom('<button>Submit</button>')

      const result = extractAccessibilityTree(container)

      expect(result).toContain('button "Submit"')
    })

    it('extractAccessibilityTree_buttonWithAriaLabel_usesAriaLabel', () => {
      container = buildDom('<button aria-label="Close dialog">X</button>')

      const result = extractAccessibilityTree(container)

      expect(result).toContain('button "Close dialog"')
    })

    it('extractAccessibilityTree_inputWithPlaceholder_usesPlaceholder', () => {
      container = buildDom('<input placeholder="Username" />')

      const result = extractAccessibilityTree(container)

      expect(result).toContain('input "Username"')
    })

    it('extractAccessibilityTree_elementWithDataAiId_appendsAiId', () => {
      container = buildDom('<div data-ai-id="user-profile-settings"><input placeholder="name" /></div>')

      const result = extractAccessibilityTree(container)

      expect(result).toContain('[ai:user-profile-settings]')
    })

    it('extractAccessibilityTree_elementWithDataAiIdAndKey_appendsBoth', () => {
      container = buildDom('<div data-ai-id="user-profile" data-ai-key="user-profile"></div>')

      const result = extractAccessibilityTree(container)

      expect(result).toContain('[ai:user-profile]')
      expect(result).toContain('(user-profile)')
    })

    it('extractAccessibilityTree_nestedElements_indentsByDepth', () => {
      container = buildDom('<nav><button>Home</button></nav>')

      const result = extractAccessibilityTree(container)
      const lines = result.split('\n')
      const navLine = lines.find((l) => l.trimStart().startsWith('nav'))
      const buttonLine = lines.find((l) => l.trimStart().startsWith('button'))

      expect(navLine).toBeDefined()
      expect(buttonLine).toBeDefined()
      expect(buttonLine!.length - buttonLine!.trimStart().length).toBeGreaterThan(
        navLine!.length - navLine!.trimStart().length,
      )
    })

    it('extractAccessibilityTree_elementWithRole_isIncluded', () => {
      container = buildDom('<div role="dialog">Content</div>')

      const result = extractAccessibilityTree(container)

      expect(result).toContain('div')
    })

    it('extractAccessibilityTree_plainDiv_isExcluded', () => {
      container = buildDom('<div class="wrapper"><span>text</span></div>')

      const result = extractAccessibilityTree(container)

      expect(result).toBe('')
    })

    it('extractAccessibilityTree_manyNodes_capsAt60', () => {
      const items = Array.from({ length: 70 }, (_, i) => `<button>Item ${i}</button>`).join('')
      container = buildDom(`<div>${items}</div>`)

      const result = extractAccessibilityTree(container)
      const lines = result.split('\n')
      const buttonLines = lines.filter((l) => l.trimStart().startsWith('button'))

      expect(buttonLines.length).toBe(60)
      expect(result).toContain('more nodes')
    })

    it('extractAccessibilityTree_textOver40Chars_isTruncated', () => {
      const longText = 'A'.repeat(50)
      container = buildDom(`<button>${longText}</button>`)

      const result = extractAccessibilityTree(container)

      expect(result).toContain('button "')
      const match = result.match(/button "([^"]*)"/)
      expect(match![1].length).toBeLessThanOrEqual(40)
    })

    it('extractAccessibilityTree_ariaLabelledby_resolvesLabel', () => {
      document.body.innerHTML = '<span id="lbl">My Label</span><div data-ai-id="x" aria-labelledby="lbl"></div>'
      container = document.body

      const result = extractAccessibilityTree(container)

      expect(result).toContain('"My Label"')
    })

    it('extractAccessibilityTree_multipleSemanticElements_allIncluded', () => {
      container = buildDom('<main><h1>Title</h1><nav><a href="#">Link</a></nav></main>')

      const result = extractAccessibilityTree(container)

      expect(result).toContain('main')
      expect(result).toContain('h1')
      expect(result).toContain('nav')
      expect(result).toContain('a')
    })
  })
})
