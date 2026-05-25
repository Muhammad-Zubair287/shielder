import {
  hasPriceFilterValue,
  parsePriceFilterValue,
  appendPriceRangeParams,
  getPriceRangeValidationKey,
} from '../price-filter'

describe('price-filter helpers', () => {
  describe('hasPriceFilterValue()', () => {
    it('returns true for numeric string zero', () => {
      expect(hasPriceFilterValue('0')).toBe(true)
    })

    it('returns true for numeric string with value', () => {
      expect(hasPriceFilterValue('100')).toBe(true)
      expect(hasPriceFilterValue('999.99')).toBe(true)
    })

    it('returns true for numeric string with leading/trailing whitespace', () => {
      expect(hasPriceFilterValue('  50  ')).toBe(true)
      expect(hasPriceFilterValue('\t0\t')).toBe(true)
    })

    it('returns false for empty string', () => {
      expect(hasPriceFilterValue('')).toBe(false)
    })

    it('returns false for whitespace-only string', () => {
      expect(hasPriceFilterValue('   ')).toBe(false)
      expect(hasPriceFilterValue('\t\n')).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(hasPriceFilterValue(undefined as any)).toBe(false)
    })

    it('returns false for null', () => {
      expect(hasPriceFilterValue(null as any)).toBe(false)
    })
  })

  describe('parsePriceFilterValue()', () => {
    it('parses numeric string zero correctly', () => {
      expect(parsePriceFilterValue('0')).toBe(0)
    })

    it('parses positive numeric strings', () => {
      expect(parsePriceFilterValue('100')).toBe(100)
      expect(parsePriceFilterValue('999')).toBe(999)
    })

    it('parses decimal values', () => {
      expect(parsePriceFilterValue('99.99')).toBe(99.99)
      expect(parsePriceFilterValue('0.50')).toBe(0.5)
    })

    it('parses strings with whitespace', () => {
      expect(parsePriceFilterValue('  100  ')).toBe(100)
      expect(parsePriceFilterValue('\t50\n')).toBe(50)
    })

    it('returns null for empty string', () => {
      expect(parsePriceFilterValue('')).toBeNull()
    })

    it('returns null for whitespace-only string', () => {
      expect(parsePriceFilterValue('   ')).toBeNull()
    })

    it('returns NaN for non-numeric strings', () => {
      expect(Number.isNaN(parsePriceFilterValue('abc'))).toBe(true)
      expect(Number.isNaN(parsePriceFilterValue('foo'))).toBe(true)
    })

    it('handles negative numbers (parses but returns valid negative)', () => {
      // The function parses negative values, though the input validation
      // should reject them at schema level
      expect(parsePriceFilterValue('-50')).toBe(-50)
    })

    it('returns null for undefined', () => {
      expect(parsePriceFilterValue(undefined as any)).toBeNull()
    })

    it('returns null for null', () => {
      expect(parsePriceFilterValue(null as any)).toBeNull()
    })
  })

  describe('appendPriceRangeParams()', () => {
    it('returns params with zero as minPrice', () => {
      const params = appendPriceRangeParams('0', undefined)
      expect(params.toString()).toBe('minPrice=0')
    })

    it('returns params with zero as maxPrice', () => {
      const params = appendPriceRangeParams(undefined, '0')
      expect(params.toString()).toBe('maxPrice=0')
    })

    it('returns params with both zero values', () => {
      const params = appendPriceRangeParams('0', '0')
      expect(params.get('minPrice')).toBe('0')
      expect(params.get('maxPrice')).toBe('0')
    })

    it('returns params with numeric values', () => {
      const params = appendPriceRangeParams('50', '500')
      expect(params.get('minPrice')).toBe('50')
      expect(params.get('maxPrice')).toBe('500')
    })

    it('ignores empty/whitespace-only minPrice', () => {
      const params = appendPriceRangeParams('', '100')
      expect(params.get('minPrice')).toBeNull()
      expect(params.get('maxPrice')).toBe('100')
    })

    it('ignores empty/whitespace-only maxPrice', () => {
      const params = appendPriceRangeParams('50', '   ')
      expect(params.get('minPrice')).toBe('50')
      expect(params.get('maxPrice')).toBeNull()
    })

    it('ignores both empty values', () => {
      const params = appendPriceRangeParams('', '')
      expect(params.toString()).toBe('')
    })

    it('returns params with only minPrice when maxPrice is undefined', () => {
      const params = appendPriceRangeParams('100', undefined)
      expect(params.get('minPrice')).toBe('100')
      expect(params.get('maxPrice')).toBeNull()
    })

    it('returns params with only maxPrice when minPrice is undefined', () => {
      const params = appendPriceRangeParams(undefined, '200')
      expect(params.get('minPrice')).toBeNull()
      expect(params.get('maxPrice')).toBe('200')
    })

    it('handles decimal price values', () => {
      const params = appendPriceRangeParams('9.99', '99.99')
      expect(params.get('minPrice')).toBe('9.99')
      expect(params.get('maxPrice')).toBe('99.99')
    })

    it('returns URLSearchParams instance', () => {
      const params = appendPriceRangeParams('50', '100')
      expect(params).toBeInstanceOf(URLSearchParams)
    })

    it('trims whitespace from values', () => {
      const params = appendPriceRangeParams('  50  ', '\t100\n')
      expect(params.get('minPrice')).toBe('50')
      expect(params.get('maxPrice')).toBe('100')
    })
  })

  describe('getPriceRangeValidationKey()', () => {
    it('returns productsPriceValidationRange key when maxPrice is less than minPrice', () => {
      const key = getPriceRangeValidationKey({ minPrice: '500', maxPrice: '100' })
      expect(key).toBe('productsPriceValidationRange')
    })

    it('returns null when maxPrice equals minPrice (valid range)', () => {
      // Assuming the function allows equal values (max >= min), test that equality passes
      const key = getPriceRangeValidationKey({ minPrice: '100', maxPrice: '100' })
      expect(key).toBeNull() // Should be valid, not return error key
    })

    it('returns null when minPrice is less than maxPrice', () => {
      const key = getPriceRangeValidationKey({ minPrice: '100', maxPrice: '500' })
      expect(key).toBeNull()
    })

    it('returns null when only minPrice is provided', () => {
      const key = getPriceRangeValidationKey({ minPrice: '100', maxPrice: undefined })
      expect(key).toBeNull()
    })

    it('returns null when only maxPrice is provided', () => {
      const key = getPriceRangeValidationKey({ minPrice: undefined, maxPrice: '500' })
      expect(key).toBeNull()
    })

    it('returns null when neither filter is provided', () => {
      const key = getPriceRangeValidationKey({ minPrice: undefined, maxPrice: undefined })
      expect(key).toBeNull()
    })

    it('returns null for zero minPrice and higher maxPrice', () => {
      const key = getPriceRangeValidationKey({ minPrice: '0', maxPrice: '100' })
      expect(key).toBeNull()
    })

    it('returns null for zero maxPrice with zero minPrice', () => {
      const key = getPriceRangeValidationKey({ minPrice: '0', maxPrice: '0' })
      expect(key).toBeNull()
    })

    it('handles string parsing for comparison', () => {
      // Test that the function correctly parses string numbers
      const key = getPriceRangeValidationKey({ minPrice: '99.99', maxPrice: '100.00' })
      expect(key).toBeNull()
    })

    it('returns productsPriceValidationRange key for decimal comparison edge case', () => {
      const key = getPriceRangeValidationKey({ minPrice: '100.01', maxPrice: '100.00' })
      expect(key).toBe('productsPriceValidationRange')
    })

    it('handles empty strings as no filter', () => {
      const key = getPriceRangeValidationKey({ minPrice: '', maxPrice: '' })
      expect(key).toBeNull()
    })

    it('handles whitespace-only strings as no filter', () => {
      const key = getPriceRangeValidationKey({ minPrice: '   ', maxPrice: '\t' })
      expect(key).toBeNull()
    })
  })

  describe('integration: combined filter workflows', () => {
    it('validates and appends valid price range to params', () => {
      const minPrice = '0'
      const maxPrice = '1000'

      // Check validation first
      const validationError = getPriceRangeValidationKey({ minPrice, maxPrice })
      expect(validationError).toBeNull()

      // Then append params
      const params = appendPriceRangeParams(minPrice, maxPrice)
      expect(params.toString()).toContain('minPrice=0')
      expect(params.toString()).toContain('maxPrice=1000')
    })

    it('correctly handles zero-only filter', () => {
      const minPrice = '0'
      const maxPrice = undefined

      const hasMinPrice = hasPriceFilterValue(minPrice)
      expect(hasMinPrice).toBe(true)

      const validationError = getPriceRangeValidationKey({ minPrice, maxPrice })
      expect(validationError).toBeNull()

      const params = appendPriceRangeParams(minPrice, maxPrice)
      expect(params.toString()).toBe('minPrice=0')
    })

    it('rejects invalid price range before appending params', () => {
      const minPrice = '500'
      const maxPrice = '100'

      const validationError = getPriceRangeValidationKey({ minPrice, maxPrice })
      expect(validationError).toBe('productsPriceValidationRange')

      // Should not append params if validation fails
      // In real usage, this prevents the invalid query from being sent
    })

    it('handles user clearing one filter while keeping another', () => {
      const minPrice = '50'
      const maxPrice = '' // User cleared max

      const hasMaxPrice = hasPriceFilterValue(maxPrice)
      expect(hasMaxPrice).toBe(false)

      const params = appendPriceRangeParams(minPrice, maxPrice)
      expect(params.toString()).toBe('minPrice=50')
      expect(params.toString()).not.toContain('maxPrice')
    })
  })
})
