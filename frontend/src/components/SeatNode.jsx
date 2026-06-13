import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSeatMapStore } from '../store/useSeatMapStore';

/**
 * MD3 semantic state color tokens.
 * These are the exact fills requested by the design specification.
 */
const STATE_COLORS = {
  FREE: {
    fill: '#EAF3DE',
    stroke: '#6AA84F',
    strokeHover: '#4C8033',
    text: '#2D5016',
    labelText: '#4A7A2E',
    auraRing: 'rgba(106, 168, 79, 0.35)',
  },
  OCCUPIED: {
    fill: '#FCEBEB',
    stroke: '#C85C5C',
    text: '#8B1A1A',
    labelText: '#A63D3D',
    maskText: '#6B2020',
  },
  AWAY: {
    fill: '#FAEEDA',
    stroke: '#D4A017',
    strokeDash: '#B8860B',
    text: '#6B4E00',
    labelText: '#8B6914',
    countdownText: '#7A5800',
  },
};

/**
 * SeatNode — An independent, surgically-rendered desk coordinate component.
 *
 * Architecture:
 * - Hooks directly to a single Zustand slice selector: `useSeatMapStore(s => s.seats.get(id))`
 * - Uses requestAnimationFrame for AWAY countdown to eliminate client timer drift
 * - CSS hover heat aura ripple for FREE state
 * - Animated stroke-dasharray marching-ants border for AWAY state
 * - Partial-masked User ID display for OCCUPIED state
 *
 * @param {string}   seatId   - Unique desk identifier (e.g. 'A1', 'B3')
 * @param {number}   x        - Absolute X coordinate within the SVG viewBox
 * @param {number}   y        - Absolute Y coordinate within the SVG viewBox
 * @param {function} onSelect - Callback triggered when a seat node is clicked
 */
export const SeatNode = ({ seatId, x, y, onSelect }) => {
  // ── Zustand single-slice selector (O(1) surgical subscription) ──
  const seat = useSeatMapStore((s) => s.seats.get(seatId));

  // ── rAF-based countdown state ──
  const [displayTime, setDisplayTime] = useState('');
  const rafRef = useRef(null);
  const anchorRef = useRef(null); // { wallTime, serverSeconds } snapshot
  const [isHovered, setIsHovered] = useState(false);

  /**
   * Format milliseconds remaining into MM:SS with tabular-numeric precision.
   * @param {number} ms - Remaining milliseconds
   * @returns {string} Formatted countdown string
   */
  const formatMs = useCallback((ms) => {
    if (ms <= 0) return '00:00';
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }, []);

  /**
   * requestAnimationFrame tick loop.
   * Uses a wall-clock anchor to calculate elapsed delta milliseconds,
   * preventing drift that setInterval-based timers accumulate over time.
   */
  const tick = useCallback((timestamp) => {
    if (!anchorRef.current) return;

    const elapsed = performance.now() - anchorRef.current.wallTime;
    const remainingMs = (anchorRef.current.serverSeconds * 1000) - elapsed;

    if (remainingMs <= 0) {
      setDisplayTime('00:00');
      rafRef.current = null;
      return;
    }

    setDisplayTime(formatMs(remainingMs));
    rafRef.current = requestAnimationFrame(tick);
  }, [formatMs]);

  // ── Anchor reset whenever server pushes a new timeRemaining ──
  useEffect(() => {
    // Cancel any existing animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!seat || seat.status === 'FREE' || !seat.timeRemaining || seat.timeRemaining <= 0) {
      setDisplayTime('');
      anchorRef.current = null;
      return;
    }

    // Snapshot the wall clock at the moment the server value arrives
    anchorRef.current = {
      wallTime: performance.now(),
      serverSeconds: seat.timeRemaining,
    };

    setDisplayTime(formatMs(seat.timeRemaining * 1000));
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [seat?.status, seat?.timeRemaining, tick, formatMs]);

  if (!seat) return null;

  // ── Resolve semantic state ──
  const status = seat.status;
  const isFree = status === 'FREE';
  const isOccupied = status === 'OCCUPIED';
  const isAway = status === 'AWAY';

  const colors = STATE_COLORS[status] || STATE_COLORS.FREE;
  const cssClass = isFree ? 'seat-node-free' : isOccupied ? 'seat-node-occupied' : 'seat-node-away';

  /**
   * Build a partial-masked user ID string for OCCUPIED display.
   * Shows first 4 chars + "••••" to indicate privacy.
   */
  const maskedUserId = (() => {
    if (!isOccupied) return '';
    // Try to extract userId from the session or seat data
    const uid = seat.userId || seat.occupantId || '';
    if (!uid) return 'User';
    return uid.substring(0, 4) + '••••';
  })();

  // ── Seat node dimensions ──
  const W = 88;
  const H = 88;
  const R = 14;
  const halfW = W / 2;
  const halfH = H / 2;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={() => onSelect(seat)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: 'pointer' }}
      className={cssClass}
      role="button"
      aria-label={`Seat ${seatId}, status: ${status}`}
    >
      {/* ── Heat Aura Ripple Ring (FREE only, triggered on CSS hover) ── */}
      {isFree && (
        <rect
          className="seat-aura-ring"
          x={-halfW - 6}
          y={-halfH - 6}
          width={W + 12}
          height={H + 12}
          rx={R + 4}
          fill="none"
          stroke={colors.auraRing}
          strokeWidth="3"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* ── Away State: Marching-Ants Dashed Border ── */}
      {isAway && (
        <rect
          className="seat-border-dashed"
          x={-halfW - 3}
          y={-halfH - 3}
          width={W + 6}
          height={H + 6}
          rx={R + 2}
          fill="none"
          stroke={colors.strokeDash}
          strokeWidth="2"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* ── Main Seat Surface ── */}
      <rect
        className="seat-surface"
        x={-halfW}
        y={-halfH}
        width={W}
        height={H}
        rx={R}
        fill={colors.fill}
        stroke={isHovered && isFree ? colors.strokeHover : colors.stroke}
        strokeWidth={isHovered && isFree ? '2.5' : '1.8'}
        style={{
          transition: 'stroke 0.25s ease, stroke-width 0.25s ease, fill 0.4s ease',
        }}
      />

      {/* ── Desk ID Label ── */}
      <text
        x="0"
        y={isFree ? '2' : '-14'}
        textAnchor="middle"
        dominantBaseline="central"
        fill={colors.text}
        fontFamily="'Outfit', sans-serif"
        fontWeight="700"
        fontSize="20px"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {seatId}
      </text>

      {/* ── FREE: Subtle "Available" micro-label ── */}
      {isFree && (
        <text
          x="0"
          y="18"
          textAnchor="middle"
          dominantBaseline="central"
          fill={colors.labelText}
          fontFamily="'Outfit', sans-serif"
          fontWeight="400"
          fontSize="10px"
          opacity={isHovered ? '1' : '0.7'}
          style={{
            userSelect: 'none',
            pointerEvents: 'none',
            transition: 'opacity 0.2s ease',
          }}
        >
          Available
        </text>
      )}

      {/* ── OCCUPIED: Partial-Masked User ID ── */}
      {isOccupied && (
        <g>
          <text
            x="0"
            y="4"
            textAnchor="middle"
            dominantBaseline="central"
            fill={colors.labelText}
            fontFamily="'Outfit', sans-serif"
            fontWeight="500"
            fontSize="10px"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {maskedUserId}
          </text>
          {/* TTL display beneath the user ID mask */}
          {displayTime && (
            <text
              x="0"
              y="20"
              textAnchor="middle"
              dominantBaseline="central"
              fill={colors.maskText}
              fontFamily="'Outfit', sans-serif"
              fontWeight="400"
              fontSize="10px"
              opacity="0.65"
              style={{ userSelect: 'none', pointerEvents: 'none', fontVariantNumeric: 'tabular-nums' }}
            >
              {displayTime}
            </text>
          )}
        </g>
      )}

      {/* ── AWAY: rAF Delta-Ms Countdown ── */}
      {isAway && (
        <g>
          <text
            x="0"
            y="2"
            textAnchor="middle"
            dominantBaseline="central"
            fill={colors.labelText}
            fontFamily="'Outfit', sans-serif"
            fontWeight="600"
            fontSize="10px"
            letterSpacing="0.12em"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            AWAY
          </text>
          {displayTime && (
            <text
              className="countdown-text"
              x="0"
              y="22"
              textAnchor="middle"
              dominantBaseline="central"
              fill={colors.countdownText}
              fontFamily="'Outfit', sans-serif"
              fontWeight="700"
              fontSize="14px"
              style={{ userSelect: 'none', pointerEvents: 'none', fontVariantNumeric: 'tabular-nums' }}
            >
              {displayTime}
            </text>
          )}
        </g>
      )}
    </g>
  );
};
