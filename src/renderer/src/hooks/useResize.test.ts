import { describe, expect, it } from 'vitest'
import { computeWidth } from './useResize'

describe('computeWidth', () => {
  describe('grow-right (handle on right edge of left-anchored panel)', () => {
    it('grows when pointer drags right', () => {
      expect(
        computeWidth({
          startWidth: 200,
          startX: 100,
          pointerX: 250,
          direction: 'grow-right',
          min: 100,
          max: 400
        })
      ).toBe(350)
    })

    it('shrinks when pointer drags left', () => {
      expect(
        computeWidth({
          startWidth: 200,
          startX: 100,
          pointerX: 50,
          direction: 'grow-right',
          min: 100,
          max: 400
        })
      ).toBe(150)
    })

    it('clamps to min', () => {
      expect(
        computeWidth({
          startWidth: 200,
          startX: 100,
          pointerX: -500,
          direction: 'grow-right',
          min: 100,
          max: 400
        })
      ).toBe(100)
    })

    it('clamps to max', () => {
      expect(
        computeWidth({
          startWidth: 200,
          startX: 100,
          pointerX: 5000,
          direction: 'grow-right',
          min: 100,
          max: 400
        })
      ).toBe(400)
    })
  })

  describe('grow-left (handle on left edge of right-anchored panel)', () => {
    it('grows when pointer drags left', () => {
      expect(
        computeWidth({
          startWidth: 200,
          startX: 500,
          pointerX: 400,
          direction: 'grow-left',
          min: 100,
          max: 400
        })
      ).toBe(300)
    })

    it('shrinks when pointer drags right', () => {
      expect(
        computeWidth({
          startWidth: 200,
          startX: 500,
          pointerX: 600,
          direction: 'grow-left',
          min: 100,
          max: 400
        })
      ).toBe(100)
    })

    it('clamps to max', () => {
      expect(
        computeWidth({
          startWidth: 200,
          startX: 500,
          pointerX: -1000,
          direction: 'grow-left',
          min: 100,
          max: 400
        })
      ).toBe(400)
    })
  })

  it('returns startWidth when pointer has not moved', () => {
    expect(
      computeWidth({
        startWidth: 248,
        startX: 100,
        pointerX: 100,
        direction: 'grow-right',
        min: 100,
        max: 500
      })
    ).toBe(248)
  })
})
