import React from 'react';
import { SeatNode } from './SeatNode';
import { useSeatMapStore } from '../store/useSeatMapStore';

/**
 * ZONE CONFIGURATION
 *
 * The library floor plan is divided into two distinct viewports:
 *   1. North Wing (Quiet Zone) — Zones A + C (silent study)
 *   2. South Wing (Discussion Lab) — Zone B (collaborative work)
 *
 * Each viewport is rendered as an independent <svg> element inside a
 * shared CSS grid container. The absolute viewBox coordinates are
 * calibrated to a 580×400 local canvas per viewport, keeping seat
 * positions deterministic and resolution-independent.
 */
const ZONES = {
  north: {
    label: 'North Wing',
    subtitle: 'Quiet Zone',
    icon: '📚',
    accentColor: '#6AA84F',
    accentBg: 'rgba(106, 168, 79, 0.06)',
    borderColor: 'rgba(106, 168, 79, 0.15)',
    seats: {
      A1: { x: 120, y: 140 },
      A2: { x: 120, y: 280 },
      A3: { x: 280, y: 140 },
      A4: { x: 280, y: 280 },
      C1: { x: 440, y: 140 },
      C2: { x: 440, y: 280 },
    },
  },
  south: {
    label: 'South Wing',
    subtitle: 'Discussion Lab',
    icon: '💬',
    accentColor: '#7B68EE',
    accentBg: 'rgba(123, 104, 238, 0.06)',
    borderColor: 'rgba(123, 104, 238, 0.15)',
    seats: {
      B1: { x: 100, y: 140 },
      B2: { x: 100, y: 280 },
      B3: { x: 260, y: 140 },
      B4: { x: 260, y: 280 },
      C3: { x: 420, y: 140 },
      C4: { x: 420, y: 280 },
    },
  },
};

/**
 * STATUS LEGEND CONFIGURATION
 * Maps semantic seat states to their MD3 fill colors and labels.
 */
const LEGEND_ITEMS = [
  { fill: '#EAF3DE', stroke: '#6AA84F', label: 'Available' },
  { fill: '#FCEBEB', stroke: '#C85C5C', label: 'Occupied' },
  { fill: '#FAEEDA', stroke: '#D4A017', label: 'Away' },
];

/**
 * ZoneViewport — Renders a single library wing as a self-contained SVG canvas.
 *
 * @param {object} zone       - Zone configuration (label, subtitle, seats, etc.)
 * @param {string[]} seatIds  - Filtered seat IDs that belong to this zone
 * @param {function} onSelect - Callback for seat click events
 */
const ZoneViewport = ({ zone, seatIds, onSelect }) => {
  const viewBoxW = 560;
  const viewBoxH = 380;

  return (
    <div
      className="zone-viewport"
      style={{
        flex: '1 1 0',
        minWidth: '420px',
        borderRadius: '20px',
        border: `1px solid ${zone.borderColor}`,
        backgroundColor: '#14171e',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Zone Header Bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 20px',
          borderBottom: `1px solid ${zone.borderColor}`,
          background: zone.accentBg,
        }}
      >
        <span style={{ fontSize: '20px' }}>{zone.icon}</span>
        <div>
          <div
            style={{
              fontSize: '15px',
              fontWeight: '700',
              color: zone.accentColor,
              letterSpacing: '0.04em',
              lineHeight: 1.2,
            }}
          >
            {zone.label}
          </div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: '400',
              color: '#8e9099',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {zone.subtitle}
          </div>
        </div>
        {/* Live seat count badge */}
        <div
          style={{
            marginLeft: 'auto',
            fontSize: '11px',
            fontWeight: '600',
            color: zone.accentColor,
            backgroundColor: `${zone.accentColor}15`,
            padding: '4px 10px',
            borderRadius: '20px',
            border: `1px solid ${zone.accentColor}30`,
            letterSpacing: '0.03em',
          }}
        >
          {seatIds.length} Desks
        </div>
      </div>

      {/* ── SVG Canvas ── */}
      <svg
        viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
        width="100%"
        style={{
          flex: 1,
          display: 'block',
        }}
        role="img"
        aria-label={`${zone.label} floor plan`}
      >
        {/* Background surface */}
        <rect x="0" y="0" width={viewBoxW} height={viewBoxH} fill="#14171e" />

        {/* Subtle grid pattern */}
        <defs>
          <pattern id={`grid-${zone.label.replace(/\s/g, '')}`} width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e222b" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={viewBoxW} height={viewBoxH} fill={`url(#grid-${zone.label.replace(/\s/g, '')})`} />

        {/* Desk row divider lines */}
        <line x1="60" y1="210" x2={viewBoxW - 60} y2="210" stroke="#262a32" strokeWidth="1" strokeDasharray="6 8" />

        {/* Column dividers between desk pairs */}
        {Object.values(zone.seats).reduce((acc, coord, i, arr) => {
          if (i > 0 && i % 2 === 0) {
            const prevX = arr[i - 1].x;
            const midX = (prevX + coord.x) / 2;
            acc.push(
              <line
                key={`divider-${i}`}
                x1={midX}
                y1="80"
                x2={midX}
                y2="340"
                stroke="#1e222b"
                strokeWidth="1.5"
                strokeDasharray="3 6"
              />
            );
          }
          return acc;
        }, [])}

        {/* ── Render Seat Nodes ── */}
        {seatIds.map((id) => {
          const coords = zone.seats[id];
          if (!coords) return null;
          return (
            <SeatNode
              key={id}
              seatId={id}
              x={coords.x}
              y={coords.y}
              onSelect={onSelect}
            />
          );
        })}
      </svg>
    </div>
  );
};

/**
 * SeatMap — The root library floor plan canvas.
 *
 * Renders two distinct ZoneViewport panels arranged horizontally,
 * with a shared status legend bar below them.
 * Subscribes only to the set of seat IDs (not statuses) to prevent
 * parent re-renders when individual seat states change.
 */
export const SeatMap = ({ onSelectSeat }) => {
  // Subscribe ONLY to the key set — status changes within seats
  // are handled exclusively by each SeatNode's own Zustand selector.
  const seatIdsJoined = useSeatMapStore((s) => Array.from(s.seats.keys()).join(','));
  const hasSeatsLoaded = seatIdsJoined.length > 0;

  if (!hasSeatsLoaded) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        minHeight: '400px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #2d3139',
            borderTopColor: '#6AA84F',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#8e9099', fontSize: '14px', fontWeight: '400' }}>
            Connecting to seat map database…
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const allIds = seatIdsJoined.split(',');
  const northIds = allIds.filter((id) => id in ZONES.north.seats);
  const southIds = allIds.filter((id) => id in ZONES.south.seats);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '8px',
      boxSizing: 'border-box',
    }}>
      {/* ── Dual Viewport Container ── */}
      <div style={{
        display: 'flex',
        gap: '16px',
        flex: 1,
        minHeight: 0,
        flexWrap: 'wrap',
      }}>
        <ZoneViewport
          zone={ZONES.north}
          seatIds={northIds}
          onSelect={onSelectSeat}
        />
        <ZoneViewport
          zone={ZONES.south}
          seatIds={southIds}
          onSelect={onSelectSeat}
        />
      </div>

      {/* ── Status Legend Bar ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '32px',
        padding: '10px 24px',
        borderRadius: '14px',
        backgroundColor: '#171b23',
        border: '1px solid #2d3139',
        flexShrink: 0,
      }}>
        {LEGEND_ITEMS.map((item) => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div style={{
              width: '14px',
              height: '14px',
              borderRadius: '4px',
              backgroundColor: item.fill,
              border: `1.5px solid ${item.stroke}`,
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: '12px',
              fontWeight: '500',
              color: '#c4c6d0',
              letterSpacing: '0.02em',
            }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
