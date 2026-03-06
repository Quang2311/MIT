/* ===== Chart SVG utilities for Journey View ===== */
/* Mock data removed — JourneyView now fetches live data from Supabase */

/*
 * ===== XP SCORING LOGIC (For Supabase integration) =====
 *
 * FORMULA:
 *   - Each completed MIT task (is_completed = true)  →  +10 XP
 *   - If ALL tasks in a day are completed (100%)     →  Bonus +50 XP
 *
 * EXAMPLE (day with 5 tasks, all completed):
 *   Base:  5 × 10 = 50 XP
 *   Bonus: +50 XP (100% completion)
 *   Total: 100 XP for that day
 *
 * EXAMPLE (day with 4 tasks, 3 completed):
 *   Base:  3 × 10 = 30 XP
 *   Bonus: 0 XP (not 100%)
 *   Total: 30 XP for that day
 *
 * RANKING:
 *   Total XP is aggregated across all days and used to rank users
 *   on the "🏆 Bảng Vàng MITs" (Top Performers) widget on Dashboard.
 *
 * DB COLUMNS:
 *   - profiles.total_xp: cumulative XP for user
 *   - mit_sessions.xp_earned: XP earned in a single checkout
 */

/* ===== SVG Smooth Path Generator ===== */
const CHART_W = 600;
const CHART_H = 200;
const PAD_X = 40;
const PAD_Y = 20;

export const chartDimensions = { width: CHART_W, height: CHART_H, padX: PAD_X, padY: PAD_Y };

interface PointData {
    completed: number;
    total: number;
}

/** Convert data points into (x, y) pixel coordinates */
export function getPoints(data: PointData[], maxY = 5): { x: number; y: number }[] {
    const usableW = CHART_W - PAD_X * 2;
    const usableH = CHART_H - PAD_Y * 2;
    return data.map((d, i) => ({
        x: PAD_X + (i / Math.max(data.length - 1, 1)) * usableW,
        y: PAD_Y + usableH - (d.completed / maxY) * usableH,
    }));
}

/** Generate a smooth cubic bezier SVG path string */
export function generateSmoothPath(points: { x: number; y: number }[]): string {
    if (points.length < 2) return "";
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(i - 1, 0)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(i + 2, points.length - 1)];
        const tension = 0.3;
        const cp1x = p1.x + (p2.x - p0.x) * tension;
        const cp1y = p1.y + (p2.y - p0.y) * tension;
        const cp2x = p2.x - (p3.x - p1.x) * tension;
        const cp2y = p2.y - (p3.y - p1.y) * tension;
        d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
}

/** Generate the filled area path (line + close to bottom) */
export function generateAreaPath(points: { x: number; y: number }[]): string {
    const linePath = generateSmoothPath(points);
    if (!linePath) return "";
    return `${linePath} L ${points[points.length - 1].x},${CHART_H - PAD_Y} L ${points[0].x},${CHART_H - PAD_Y} Z`;
}
