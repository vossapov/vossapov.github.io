(function(){
'use strict';
const AZIMUTH = 45;
const ELEVATION = 30;
const SHADES = 4;
const RADIANS = Math.PI / 180;
const UNIT = Math.sqrt(1.6);
function cameraOf({ scale, azimuth = AZIMUTH, elevation = ELEVATION }) {
    const a = azimuth * RADIANS;
    const e = elevation * RADIANS;
    return { sinA: Math.sin(a), cosA: Math.cos(a), sinE: Math.sin(e), cosE: Math.cos(e), k: scale * UNIT };
}
function iso([x, y, z], projection) {
    const { origin } = projection;
    const { sinA, cosA, sinE, cosE, k } = cameraOf(projection);
    return [origin[0] + (x * sinA - y * cosA) * k, origin[1] + ((x * cosA + y * sinA) * sinE - z * cosE) * k];
}
function towardViewer(projection) {
    const { sinA, cosA } = cameraOf(projection);
    return [cosA, sinA];
}
function depthOf([x, y, z], projection) {
    const { sinA, cosA, sinE, cosE } = cameraOf(projection);
    return (x * cosA + y * sinA) * cosE + z * sinE;
}
const tenth = (value) => {
    const text = (Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, "");
    return text === "-0" ? "0" : text;
};
function pathOf(points, closed = false) {
    if (!points.length)
        return "";
    return points.map(([x, y], at) => `${at ? "L" : "M"}${tenth(x)} ${tenth(y)}`).join("") + (closed ? "Z" : "");
}
const joinPaths = (paths) => paths.filter(Boolean).join("");
function roundedPlan({ x, y, w, d, r }, steps = 8) {
    const radius = Math.max(0, Math.min(r, w / 2, d / 2));
    const corners = [
        [x + w - radius, y + radius, -90],
        [x + w - radius, y + d - radius, 0],
        [x + radius, y + d - radius, 90],
        [x + radius, y + radius, 180],
    ];
    const out = [];
    for (const [cx, cy, start] of corners) {
        const count = radius > 0 ? steps : 0;
        for (let step = 0; step <= count; step++) {
            const angle = (start + (count ? (90 * step) / count : 45)) * RADIANS;
            out.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
        }
    }
    return out;
}
function signedArea(points) {
    let area = 0;
    for (let index = 0; index < points.length; index++) {
        const [ax, ay] = points[index];
        const [bx, by] = points[(index + 1) % points.length];
        area += ax * by - bx * ay;
    }
    return area / 2;
}
const oriented = (points) => (signedArea(points) < 0 ? [...points].reverse() : points);
function convexHull(points) {
    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (sorted.length < 3)
        return sorted;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [];
    for (const point of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0)
            lower.pop();
        lower.push(point);
    }
    const upper = [];
    for (let index = sorted.length - 1; index >= 0; index--) {
        const point = sorted[index];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0)
            upper.pop();
        upper.push(point);
    }
    return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
function runsOf(flags, want) {
    const count = flags.length;
    const runs = [];
    const start = flags.findIndex((flag, index) => flag !== flags[(index + count - 1) % count]);
    if (start < 0)
        return flags[0] === want ? [Array.from({ length: count + 1 }, (_, index) => index % count)] : [];
    let run = null;
    for (let step = 0; step < count; step++) {
        const index = (start + step) % count;
        if (flags[index] === want) {
            if (!run)
                run = [index];
            run.push((index + 1) % count);
        }
        else if (run) {
            runs.push(run);
            run = null;
        }
    }
    if (run)
        runs.push(run);
    return runs;
}
function extrude(ring, z, height, projection, options = {}) {
    const convex = options.convex ?? true;
    const count = ring.length;
    const counter = signedArea(ring) > 0;
    const [vx, vy] = towardViewer(projection);
    const { sinA, cosA } = cameraOf(projection);
    const normals = ring.map(([ax, ay], index) => {
        const [bx, by] = ring[(index + 1) % count];
        const dx = bx - ax;
        const dy = by - ay;
        const length = Math.hypot(dx, dy) || 1;
        return (counter ? [dy / length, -dx / length] : [-dy / length, dx / length]);
    });
    const facing = normals.map(([nx, ny]) => nx * vx + ny * vy > 1e-9);
    const top = ring.map(([x, y]) => iso([x, y, z + height], projection));
    const bottom = ring.map(([x, y]) => iso([x, y, z], projection));
    const outline = [];
    const crease = [];
    for (const run of runsOf(facing, false))
        outline.push(pathOf(run.map((index) => top[index])));
    for (const run of runsOf(facing, true)) {
        crease.push(pathOf(run.map((index) => top[index])));
        if (height > 0)
            outline.push(pathOf(run.map((index) => bottom[index])));
    }
    if (height > 0) {
        for (let index = 0; index < count; index++) {
            if (facing[(index + count - 1) % count] !== facing[index])
                outline.push(pathOf([top[index], bottom[index]]));
        }
    }
    let fill;
    if (convex) {
        fill = pathOf(convexHull([...top, ...bottom]), true);
    }
    else {
        const parts = [pathOf(oriented(top), true), pathOf(oriented(bottom), true)];
        for (let index = 0; index < count; index++) {
            if (!facing[index])
                continue;
            const next = (index + 1) % count;
            parts.push(pathOf(oriented([top[index], top[next], bottom[next], bottom[index]]), true));
        }
        fill = parts.join("");
    }
    const buckets = Array.from({ length: SHADES }, () => []);
    if (height > 0) {
        const [lx, ly] = [-sinA, cosA];
        for (let index = 0; index < count; index++) {
            if (!facing[index])
                continue;
            const [nx, ny] = normals[index];
            const lit = (nx * lx + ny * ly + 1) / 2;
            const shade = Math.min(SHADES - 1, Math.max(0, Math.floor(lit * SHADES)));
            const next = (index + 1) % count;
            buckets[shade].push(pathOf(oriented([top[index], top[next], bottom[next], bottom[index]]), true));
        }
    }
    let bevel;
    if (options.bevel && options.bevel > 0) {
        const by = options.bevel;
        const inset = ring.map(([x, y], index) => {
            const [ax, ay] = normals[(index + count - 1) % count];
            const [bx, by2] = normals[index];
            const mx = ax + bx;
            const my = ay + by2;
            const length = Math.hypot(mx, my) || 1;
            return [x - (mx / length) * by, y - (my / length) * by];
        });
        const insetTop = inset.map(([x, y]) => iso([x, y, z + height], projection));
        bevel = runsOf(facing, true)
            .map((run) => pathOf([top[run[0]], ...run.slice(1, -1).map((index) => insetTop[index]), top[run[run.length - 1]]]))
            .join("");
    }
    return {
        fill,
        outline: outline.join(""),
        crease: crease.join(""),
        top: pathOf(oriented(top), true),
        shades: buckets.map((paths) => paths.join("")),
        bevel,
    };
}
const ringOf = (plan, steps = 8) => roundedPlan(plan, steps);
function slabOf(plan, z, height, projection, steps = 8, bevel = 0) {
    return extrude(ringOf(plan, steps), z, height, projection, { convex: true, bevel });
}
function circleRing(cx, cy, radius, steps = 40) {
    return Array.from({ length: steps }, (_, step) => {
        const angle = (step / steps) * Math.PI * 2;
        return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    });
}
function cylinder(cx, cy, radius, z, height, projection, steps = 32, bevel = 0) {
    return extrude(circleRing(cx, cy, radius, steps), z, height, projection, { convex: true, bevel });
}
const insetPlan = ({ x, y, w, d, r }, by) => ({ x: x + by, y: y + by, w: w - by * 2, d: d - by * 2, r: Math.max(0, r - by) });
function onTop(points, z, projection, closed = false) {
    return pathOf(points.map(([x, y]) => iso([x, y, z], projection)), closed);
}
const planOutline = (plan, z, projection, steps = 8) => onTop(ringOf(plan, steps), z, projection, true);
const lineOnTop = (from, to, z, projection) => onTop([from, to], z, projection);
const segment = (from, to, projection) => pathOf([iso(from, projection), iso(to, projection)]);
const rise = (at, from, to, projection) => segment([at[0], at[1], from], [at[0], at[1], to], projection);
const ring = (cx, cy, radius, z, projection, steps = 40) => onTop(circleRing(cx, cy, radius, steps), z, projection, true);
const pointsAt = (points, projection) => points.map((point) => iso(point, projection));
function dotGrid(x, y, columns, rows, gap, z, projection) {
    const dots = [];
    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++)
            dots.push(iso([x + column * gap, y + row * gap, z], projection));
    }
    return dots;
}
function corners({ x, y, w, d }, inset = 0) {
    return [
        [x + inset, y + inset],
        [x + w - inset, y + inset],
        [x + inset, y + d - inset],
        [x + w - inset, y + d - inset],
    ];
}
function boxCorners({ x, y, w, d }, z0, z1) {
    const out = [];
    for (const px of [x, x + w])
        for (const py of [y, y + d])
            for (const z of [z0, z1])
                out.push([px, py, z]);
    return out;
}
function knurl(cx, cy, radius, z0, z1, count, projection, inset = 0.4) {
    const [vx, vy] = towardViewer(projection);
    const lines = [];
    for (let index = 0; index < count; index++) {
        const angle = (index / count) * Math.PI * 2;
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);
        if (nx * vx + ny * vy < 0.15)
            continue;
        lines.push(segment([cx + radius * nx, cy + radius * ny, z0 + inset], [cx + radius * nx, cy + radius * ny, z1 - inset], projection));
    }
    return lines.join("");
}
function sideArc(cx, cy, radius, z, projection, steps = 24) {
    const [vx, vy] = towardViewer(projection);
    const facing = Math.atan2(vy, vx);
    const points = [];
    for (let step = 0; step <= steps; step++) {
        const angle = facing - Math.PI / 2 + (step / steps) * Math.PI;
        points.push(iso([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle), z], projection));
    }
    return pathOf(points);
}
function ringSeam(ring, z, projection) {
    const count = ring.length;
    const counter = signedArea(ring) > 0;
    const [vx, vy] = towardViewer(projection);
    const facing = ring.map(([ax, ay], index) => {
        const [bx, by] = ring[(index + 1) % count];
        const dx = bx - ax;
        const dy = by - ay;
        const [nx, ny] = counter ? [dy, -dx] : [-dy, dx];
        return nx * vx + ny * vy > 1e-9;
    });
    return runsOf(facing, true).map((run) => pathOf(run.map((index) => iso([ring[index][0], ring[index][1], z], projection)))).join("");
}
const sideSeam = (plan, z, projection, steps = 8) => ringSeam(ringOf(plan, steps), z, projection);
function sideRing(center, radius, axis, projection, steps = 20) {
    const [px, py, pz] = center;
    const points = [];
    for (let step = 0; step < steps; step++) {
        const angle = (step / steps) * Math.PI * 2;
        const u = radius * Math.cos(angle);
        const v = radius * Math.sin(angle);
        points.push(iso(axis === "x" ? [px, py + u, pz + v] : [px + u, py, pz + v], projection));
    }
    return pathOf(points, true);
}
function coil(from, to, center, radius, turns, axis, projection, perTurn = 16) {
    const count = Math.max(1, Math.round(turns * perTurn));
    const back = [];
    const front = [];
    let run = [];
    let near = null;
    for (let index = 0; index <= count; index++) {
        const share = index / count;
        const angle = share * turns * Math.PI * 2;
        const u = radius * Math.cos(angle);
        const v = radius * Math.sin(angle);
        const along = from + (to - from) * share;
        const point = axis === "x" ? [along, center[0] + u, center[1] + v] : [center[0] + u, along, center[1] + v];
        const normal = axis === "x" ? [0, Math.cos(angle), Math.sin(angle)] : [Math.cos(angle), 0, Math.sin(angle)];
        const facing = depthOf(normal, projection) > 0;
        const flat = iso(point, projection);
        if (near === null)
            near = facing;
        if (facing !== near) {
            run.push(flat);
            (near ? front : back).push(pathOf(run));
            run = [flat];
            near = facing;
            continue;
        }
        run.push(flat);
    }
    if (run.length > 1)
        (near ? front : back).push(pathOf(run));
    return { back: back.join(""), front: front.join("") };
}
function topTicks(from, to, step, every, edge, z, lengths, projection, axis = "x") {
    const minor = [];
    const major = [];
    const first = Math.ceil(from / step) * step;
    for (let at = first, index = Math.round(first / step); at <= to + 1e-9; at += step, index++) {
        const big = index % every === 0;
        const length = big ? lengths[1] : lengths[0];
        const a = axis === "x" ? [at, edge] : [edge, at];
        const b = axis === "x" ? [at, edge + length] : [edge + length, at];
        (big ? major : minor).push(lineOnTop(a, b, z, projection));
    }
    return { minor: minor.join(""), major: major.join("") };
}
function sideTicks(from, to, step, every, face, top, lengths, projection, axis = "x") {
    const minor = [];
    const major = [];
    const first = Math.ceil(from / step) * step;
    for (let at = first, index = Math.round(first / step); at <= to + 1e-9; at += step, index++) {
        const big = index % every === 0;
        const length = big ? lengths[1] : lengths[0];
        const a = axis === "x" ? [at, face, top] : [face, at, top];
        const b = axis === "x" ? [at, face, top - length] : [face, at, top - length];
        (big ? major : minor).push(segment(a, b, projection));
    }
    return { minor: minor.join(""), major: major.join("") };
}
function radialTicks(cx, cy, radius, count, every, z, lengths, projection, from = 0, span = Math.PI * 2) {
    const minor = [];
    const major = [];
    const closed = Math.abs(span - Math.PI * 2) < 1e-9;
    const steps = closed ? count : count + 1;
    for (let index = 0; index < steps; index++) {
        const angle = from + (index / count) * span;
        const big = index % every === 0;
        const inner = radius - (big ? lengths[1] : lengths[0]);
        const sx = Math.sin(angle);
        const sy = -Math.cos(angle);
        (big ? major : minor).push(lineOnTop([cx + sx * inner, cy + sy * inner], [cx + sx * radius, cy + sy * radius], z, projection));
    }
    return { minor: minor.join(""), major: major.join("") };
}
const haloOf = (plan, z, height, projection) => slabOf(plan, z, height, projection).fill;
function axisVector(projection, [dx, dy, dz]) {
    const origin = iso([0, 0, 0], projection);
    const moved = iso([dx, dy, dz], projection);
    return [moved[0] - origin[0], moved[1] - origin[1]];
}
const fine = (value) => Math.round(value * 100) / 100;
function translateAlong(projection, by) {
    const [x, y] = axisVector(projection, by);
    return `translate(${fine(x)} ${fine(y)})`;
}
const thousandth = (value) => Math.round(value * 1000) / 1000;
function axesAt(at, z, projection) {
    const origin = iso([at[0], at[1], z], projection);
    const along = (point) => {
        const [px, py] = iso(point, projection);
        return [px - origin[0], py - origin[1]];
    };
    return { origin, x: along([at[0] + 1, at[1], z]), y: along([at[0], at[1] + 1, z]), z: along([at[0], at[1], z + 1]) };
}
const matrixOf = (u, v, origin) => `matrix(${thousandth(u[0])} ${thousandth(u[1])} ${thousandth(v[0])} ${thousandth(v[1])} ${thousandth(origin[0])} ${thousandth(origin[1])})`;
function holdStill(element, [dx, dy]) {
    const text = dx || dy ? `translate(${-dx} ${-dy})` : "";
    element.querySelectorAll("[data-hold]").forEach((node) => (text ? node.setAttribute("transform", text) : node.removeAttribute("transform")));
}
function topMatrix(at, z, projection, along = "x") {
    const { origin, x, y } = axesAt(at, z, projection);
    return along === "x" ? matrixOf(x, y, origin) : matrixOf([-y[0], -y[1]], x, origin);
}
function sideMatrix(at, z, projection, face) {
    const { origin, x, y, z: up } = axesAt(at, z, projection);
    const down = [-up[0], -up[1]];
    return face === "left" ? matrixOf(x, down, origin) : matrixOf([-y[0], -y[1]], down, origin);
}
function screenRise(height, projection) {
    const { cosE, k } = cameraOf(projection);
    return height * cosE * k;
}
function fitProjection(points, width, height, { pad = 24, headroom = 0, azimuth = AZIMUTH, elevation = ELEVATION } = {}) {
    const unit = { origin: [0, 0], scale: 1, azimuth, elevation };
    const flat = points.map((point) => iso(point, unit));
    const xs = flat.map(([x]) => x);
    const ys = flat.map(([, y]) => y);
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const up = Math.min(...ys);
    const down = Math.max(...ys);
    const scale = Math.min((width - pad * 2) / (right - left), (height - pad * 2 - headroom) / (down - up));
    return {
        origin: [width / 2 - ((left + right) / 2) * scale, headroom + (height - headroom) / 2 - ((up + down) / 2) * scale],
        scale,
        azimuth,
        elevation,
    };
}
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const attrs = (pairs) => Object.entries(pairs)
    .filter(([, value]) => value !== undefined && value !== false)
    .map(([key, value]) => ` ${key}="${escape(String(value))}"`)
    .join("");
function solidSvg(paths, { tone = "hi", crease = "faint", halo = false, lit = false, flat = false, className, inner = "" } = {}) {
    const parts = [];
    if (halo)
        parts.push(`<path class="iso-halo" d="${paths.fill}"/>`);
    parts.push(`<path class="iso-fill" d="${paths.fill}"/>`);
    if (!flat) {
        paths.shades.forEach((d, shade) => {
            if (d)
                parts.push(`<path class="iso-shade" data-shade="${shade}" d="${d}"/>`);
        });
        parts.push(`<path class="iso-top" d="${paths.top}"/>`);
    }
    if (crease !== "none" && paths.crease)
        parts.push(`<path class="iso-line iso-crease" data-tone="${crease}" d="${paths.crease}"/>`);
    if (crease !== "none" && paths.bevel)
        parts.push(`<path class="iso-line iso-bevel" data-tone="${crease}" d="${paths.bevel}"/>`);
    if (inner)
        parts.push(inner);
    parts.push(`<path class="iso-line iso-edge" data-tone="${tone}" d="${paths.outline}"/>`);
    return `<g${attrs({ class: className ? `iso-solid ${className}` : "iso-solid", "data-lit": lit ? "" : undefined, "data-seamless": paths.seamless ? "" : undefined })}>${parts.join("")}</g>`;
}
function lineSvg(d, { tone = "lo", dotted = false, dashed = false, flow = false, className, free } = {}) {
    if (!d)
        return "";
    return `<path${attrs({
        class: className ? `iso-line ${className}` : "iso-line",
        "data-tone": tone,
        "data-free": free === true ? "" : free || undefined,
        "data-dotted": dotted ? "" : undefined,
        "data-dashed": dashed ? "" : undefined,
        "data-flow": flow ? "" : undefined,
        d,
    })}/>`;
}
function dotsSvg(points, { size = 0.5, tone = "mid", pulse = false } = {}) {
    const dots = points
        .map(([x, y, alpha], index) => `<circle cx="${tenth(x)}" cy="${tenth(y)}" r="${size}"${alpha !== undefined && alpha < 1 ? ` fill-opacity="${Math.max(0, alpha).toFixed(2)}"` : ""}${pulse ? ` data-pulse="" style="--pulse-at:${(index * 137) % 1600}ms"` : ""}/>`)
        .join("");
    return `<g class="iso-dots" data-tone="${tone}">${dots}</g>`;
}
function fadedSvg(list, style = {}) {
    const groups = new Map();
    for (const entry of list) {
        const [d, alpha] = Array.isArray(entry) ? entry : [entry.d, entry.alpha];
        if (!d || !(alpha > 0.02))
            continue;
        const level = Math.min(1, Math.round(alpha * 20) / 20);
        groups.set(level, (groups.get(level) ?? "") + d);
    }
    return [...groups].map(([alpha, d]) => (alpha >= 1 ? lineSvg(d, style) : `<g opacity="${alpha.toFixed(2)}">${lineSvg(d, style)}</g>`)).join("");
}
function fadeLineSvg(points, { fade = [0, 0], tone = "lo", className, stops = 6 } = {}) {
    if (points.length < 2)
        return "";
    const ease = (t) => t * t * (3 - 2 * t);
    const hashOf = (text) => {
        let hash = 2166136261;
        for (let index = 0; index < text.length; index++)
            hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
        return (hash >>> 0).toString(36);
    };
    const lengths = [0];
    for (let index = 1; index < points.length; index++)
        lengths.push(lengths[index - 1] + Math.hypot(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1]));
    const at = (length) => {
        let index = 1;
        while (index < points.length - 1 && lengths[index] < length)
            index++;
        const span = lengths[index] - lengths[index - 1] || 1;
        const t = Math.max(0, Math.min(1, (length - lengths[index - 1]) / span));
        return [points[index - 1][0] + (points[index][0] - points[index - 1][0]) * t, points[index - 1][1] + (points[index][1] - points[index - 1][1]) * t];
    };
    const pieceOf = (from, to) => [at(from), ...points.filter((_, index) => lengths[index] > from + 1e-6 && lengths[index] < to - 1e-6), at(to)];
    const total = lengths[lengths.length - 1];
    if (total < 1e-6)
        return "";
    let [start, end] = Array.isArray(fade) ? fade : [fade, fade];
    if (start + end > total) {
        const share = total / (start + end);
        start *= share;
        end *= share;
    }
    const paint = `var(--anatomy-${tone})`;
    const ramp = (piece, rising) => {
        const d = pathOf(piece);
        const [x1, y1] = piece[0];
        const [x2, y2] = piece[piece.length - 1];
        const id = `iso-fade-${hashOf(`${d}|${tone}|${rising}`)}`;
        const marks = Array.from({ length: stops + 1 }, (_, index) => {
            const t = index / stops;
            const alpha = ease(rising ? t : 1 - t);
            return `<stop offset="${t.toFixed(3)}" stop-opacity="${alpha.toFixed(3)}" style="stop-color:${paint}"/>`;
        }).join("");
        const gradient = `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${tenth(x1)}" y1="${tenth(y1)}" x2="${tenth(x2)}" y2="${tenth(y2)}">${marks}</linearGradient>`;
        return `<defs>${gradient}</defs><path${attrs({ class: className ? `iso-line ${className}` : "iso-line", "data-tone": tone, "data-free": rising ? "start" : "end", d, style: `stroke:url(#${id})` })}/>`;
    };
    const parts = [];
    if (start > 0.05)
        parts.push(ramp(pieceOf(0, start), true));
    if (total - end - start > 0.05)
        parts.push(lineSvg(pathOf(pieceOf(start, total - end)), { tone, className }));
    if (end > 0.05)
        parts.push(ramp(pieceOf(total - end, total), false));
    return `<g class="iso-fade">${parts.join("")}</g>`;
}
function wireSvg(from, to, { via = [], tone = "lo", dotted = false, dashed = false, flow = false, ends = "both", size = 1.2 } = {}) {
    const d = pathOf([from, ...via, to]);
    const end = ([x, y]) => `<circle class="iso-wire-end" cx="${tenth(x)}" cy="${tenth(y)}" r="${size}"/>`;
    return `<g class="iso-wire" data-tone="${tone}">${lineSvg(d, { tone, dotted, dashed, flow })}${ends === "both" || ends === "from" ? end(from) : ""}${ends === "both" || ends === "to" ? end(to) : ""}</g>`;
}
function faceTextSvg(transform, text, { size = 3, tone = "mid", anchor = "start" } = {}) {
    return `<text class="iso-face-text" data-tone="${tone}" transform="${transform}" font-size="${size}" text-anchor="${anchor}">${escape(text)}</text>`;
}
function groupSvg(children, extra = {}) {
    return `<g${attrs(extra)}>${Array.isArray(children) ? children.join("") : children}</g>`;
}
function figureSvg({ width, height, label, body, standalone = false, className }) {
    const style = standalone ? `<style>${ISO_CSS}</style>` : "";
    return `<svg${attrs({
        xmlns: "http://www.w3.org/2000/svg",
        class: `iso-svg${standalone ? " iso" : ""}${className ? ` ${className}` : ""}`,
        "data-theme": standalone || undefined,
        viewBox: `0 0 ${width} ${height}`,
        role: "img",
        "aria-label": label,
    })}>${style}${Array.isArray(body) ? body.join("") : body}</svg>`;
}
function swatchSvg(mark) {
    if (mark === "raised" || mark === "flat" || mark === "lit") {
        const body = mark === "flat" ? "M2 6.5 8 3.5 14 6.5 8 9.5Z" : "M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z";
        const crease = mark === "flat" ? "" : `<path class="iso-swatch-crease" d="M2 4.5 8 7.5 14 4.5"/>`;
        return `<svg class="iso-swatch" data-mark="${mark}" viewBox="0 0 16 10" aria-hidden="true"><path d="${body}"/>${crease}</svg>`;
    }
    return `<svg class="iso-swatch" data-mark="${mark}" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>`;
}
function plateHtml({ fig, title, hint, readout = "", keys = [], caption, body }) {
    const corner = (name, text, extra = "") => `<span class="iso-plate-corner" data-corner="${name}"${extra}>${escape(text)}</span>`;
    const legend = keys.length || caption
        ? `<figcaption class="iso-legend">${keys.length ? `<span class="iso-keys">${keys.map((key) => `<span class="iso-key">${swatchSvg(key.mark)}${escape(key.label)}</span>`).join("")}</span>` : ""}${caption ? `<span class="iso-caption">${escape(caption)}</span>` : ""}</figcaption>`
        : "";
    return `<figure class="iso-figure"><div class="iso-plate"><div class="iso-plate-corners" aria-hidden="true">${corner("fig", fig)}${title ? corner("title", title) : ""}${hint ? corner("hint", hint) : ""}${corner("readout", readout, " data-readout")}</div>${body}</div>${legend}</figure>`;
}
function pageHtml({ title, theme = "dark", body, script = "", width = 650 }) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title><style>${ISO_CSS}${PAGE_CSS.replace("__WIDTH__", String(width))}</style></head><body class="iso" data-theme="${theme}"><main class="iso-page">${body}</main>${script ? `<script type="module">${script.replace(/<\/(script)/gi, "<\\/$1")}</script>` : ""}</body></html>`;
}
const PAGE_CSS = `
*{box-sizing:border-box}
html{color-scheme:dark}
body[data-theme="light"]{color-scheme:light}
body{margin:0;background:var(--anatomy-page);color:var(--anatomy-text);font:14px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.iso-page{width:min(__WIDTH__px,100% - 32px);margin:64px auto 96px}
`;
const ISO_CSS = `
.iso{
  --anatomy-page:#0b0b0b;--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;
  --anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;
  --anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;
  --anatomy-lit-top:#262626;--anatomy-lit-shade:#1d1d1d;
  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;
  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;
  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;
  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);
  --anatomy-mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --anatomy-lift:inset 0 1px 0 0 #ffffff0a,inset 0 0 0 1px #ffffff06,0 0 0 1px #00000026,0 1px 1px -.5px #00000014,0 3px 3px -1.5px #00000014,0 6px 6px -3px #00000014,0 12px 12px -6px #00000014;
}
.iso[data-theme="light"]{
  --anatomy-page:#f2f2ef;--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;
  --anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;
  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;
  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;
  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;
  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;
  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;
  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #0000000f,0 1px 1px -.5px #0000000a,0 3px 3px -1.5px #0000000a,0 6px 6px -3px #0000000a,0 12px 12px -6px #0000000a;
}
.iso-svg{display:block;width:100%;height:auto;overflow:visible}
.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}
.iso-fill{fill:var(--anatomy-paper);stroke:none}
.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}
.iso-shade,.iso-top{stroke:none}
.iso-shade[data-shade="0"]{fill:var(--anatomy-shade-0)}
.iso-shade[data-shade="1"]{fill:var(--anatomy-shade-1)}
.iso-shade[data-shade="2"]{fill:var(--anatomy-shade-2)}
.iso-shade[data-shade="3"]{fill:var(--anatomy-shade-3)}
.iso-top{fill:var(--anatomy-top)}
.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}
.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}
.iso-solid[data-seamless]>.iso-shade,.iso-solid[data-seamless]>.iso-top{stroke-width:.4;stroke-linejoin:round}
.iso-solid[data-seamless]>.iso-shade[data-shade="0"]{stroke:var(--anatomy-shade-0)}
.iso-solid[data-seamless]>.iso-shade[data-shade="1"]{stroke:var(--anatomy-shade-1)}
.iso-solid[data-seamless]>.iso-shade[data-shade="2"]{stroke:var(--anatomy-shade-2)}
.iso-solid[data-seamless]>.iso-shade[data-shade="3"]{stroke:var(--anatomy-shade-3)}
.iso-solid[data-seamless]>.iso-top{stroke:var(--anatomy-top)}
.iso-solid[data-seamless][data-lit]>.iso-top{stroke:var(--anatomy-lit-top)}
.iso-solid[data-seamless][data-lit]>.iso-shade{stroke:var(--anatomy-lit-shade)}
.iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}
.iso-halo{fill:var(--anatomy-halo);stroke:none;filter:blur(9px);opacity:var(--anatomy-halo-opacity);transform:translateY(3px)}
.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}
.iso-line[data-tone="hi"]{stroke:var(--anatomy-hi)}
.iso-line[data-tone="mid"]{stroke:var(--anatomy-mid)}
.iso-line[data-tone="lo"]{stroke:var(--anatomy-lo)}
.iso-line[data-tone="faint"]{stroke:var(--anatomy-faint)}
.iso-line[data-tone="lit"]{stroke:var(--anatomy-lit)}
.iso-line[data-tone="red"]{stroke:var(--anatomy-red)}
.iso-line[data-tone="green"]{stroke:var(--anatomy-green)}
.iso-line[data-tone="blue"]{stroke:var(--anatomy-blue)}
.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1}
.iso-line[data-dashed]{stroke-dasharray:3 3}
.iso-line[data-flow]{stroke-dasharray:2 6}
.iso-wire-end{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}
.iso-wire[data-tone="hi"] .iso-wire-end{stroke:var(--anatomy-hi)}
.iso-wire[data-tone="mid"] .iso-wire-end{stroke:var(--anatomy-mid)}
.iso-wire[data-tone="faint"] .iso-wire-end{stroke:var(--anatomy-faint)}
.iso-wire[data-tone="lit"] .iso-wire-end{stroke:var(--anatomy-lit)}
.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}
.iso-dots[data-tone="hi"] circle{opacity:.85}
.iso-dots[data-tone="mid"] circle{opacity:.45}
.iso-dots[data-tone="lo"] circle{opacity:.22}
.iso-dots[data-tone="faint"] circle{opacity:.12}
.iso-face-text{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.04em}
.iso-face-text[data-tone="hi"]{fill:var(--anatomy-hi)}
.iso-face-text[data-tone="lo"]{fill:var(--anatomy-lo)}
.iso-face-text[data-tone="faint"]{fill:var(--anatomy-faint)}
.tb-body{fill:var(--anatomy-shade-2);stroke:none}
.tb-shine{fill:var(--anatomy-top);stroke:none}
.tb-shade{fill:var(--anatomy-shade-0);stroke:none}
.tb-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.45;stroke-linecap:butt;stroke-linejoin:round}
.tb-ring[data-tone="mid"]{stroke:var(--anatomy-mid)}
.tb-ring[data-tone="faint"]{stroke:var(--anatomy-faint)}
.tb-ring[data-tone="hi"]{stroke:var(--anatomy-hi)}
@keyframes iso-flow{to{stroke-dashoffset:-32}}
@keyframes iso-pulse{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}
.iso-line[data-flow]{animation:iso-flow 1600ms linear infinite}
.iso-dots circle[data-pulse]{animation:iso-pulse 1600ms steps(1,end) infinite;animation-delay:var(--pulse-at,0ms)}
.iso-figure{margin:32px 0 36px}
.iso-plate{position:relative;padding:52px 24px;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);--anatomy-paper:var(--anatomy-card)}
.iso-plate-corners{position:absolute;inset:18px 20px;pointer-events:none}
.iso-plate-corner{position:absolute;color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10.5px;line-height:1;letter-spacing:.04em;white-space:nowrap}
.iso-plate-corner[data-corner="fig"]{top:0;left:0;color:var(--anatomy-text)}
.iso-plate-corner[data-corner="title"]{top:0;right:0;text-transform:uppercase;letter-spacing:.1em}
.iso-plate-corner[data-corner="hint"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}
.iso-plate-corner[data-corner="readout"]{right:0;bottom:0;color:var(--anatomy-text);font-variant-numeric:tabular-nums}
.iso-plate .iso-svg{margin:0 auto}
.iso-legend{display:grid;gap:8px;margin-top:12px;color:var(--anatomy-muted);font-size:13px;line-height:1.55}
.iso-keys{display:flex;flex-wrap:wrap;gap:6px 18px}
.iso-key{display:inline-flex;align-items:center;gap:7px}
.iso-swatch{width:16px;height:10px;flex:none;overflow:visible}
.iso-swatch path{fill:none;stroke:var(--anatomy-hi);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}
.iso-swatch[data-mark="raised"] path,.iso-swatch[data-mark="flat"] path{stroke:var(--anatomy-mid)}
.iso-swatch[data-mark="lit"] path{stroke:var(--anatomy-lit)}
.iso-swatch[data-mark="dim"] path{stroke:var(--anatomy-lo)}
.iso-swatch[data-mark="dotted"] path{stroke-dasharray:.01 3;stroke-width:1.4}
.iso-swatch[data-mark="dashed"] path{stroke-dasharray:3 2.5}
.iso-swatch[data-mark="red"] path{stroke:var(--anatomy-red)}
.iso-swatch[data-mark="green"] path{stroke:var(--anatomy-green)}
.iso-swatch[data-mark="blue"] path{stroke:var(--anatomy-blue)}
.iso-swatch-crease{stroke:var(--anatomy-lo)!important}
@media (max-width:560px){.iso-plate{padding:48px 12px 70px}.iso-plate-corner[data-corner="hint"]{bottom:18px}}
@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}
`;

// Task-dispatch model: one source, one forming device, a shuttle, three agents, one output belt.
// Pure and deterministic: the same arrival times always give the same schedule and state.
// No client data and no statistics: the readout only counts tasks of this demo stream.

// A fixed demo stream of nine unformed tasks: a seed (how the crumpled sheet lies) and its agent.
const STREAM = [
  { seed: 0, agent: 0 }, { seed: 1, agent: 1 }, { seed: 2, agent: 2 },
  { seed: 3, agent: 1 }, { seed: 4, agent: 0 }, { seed: 5, agent: 2 },
  { seed: 6, agent: 0 }, { seed: 7, agent: 1 }, { seed: 8, agent: 2 },
];

// World layout (x across the bench, y toward the viewer, z up), shared with the build.
const L = {
  work: 16,                          // working height of every bed, lane and belt
  chute: { x0: -520, x1: -268, y: -80, z: 50 },
  hopper: { x: -250, y: -80, floor: 20 },
  former: { feed: -214, press: -178, punch: -134, out: -100 },
  pickup: -76,
  lanes: [-40, 40, 120],              // lane / agent centre x
  lane: { drop: -56, wait: -36 },    // queue slots on each lane (y)
  agent: { work: 8, outlet: 44 },
  belt: { y: 78, x0: -280, end: 340, fade0: 200, fade1: 290 },
};

// Phase timing (seconds).
const T = {
  chute: 2.4, drop: 0.5,
  feed: 0.7, press: 0.9, fold: 0.5, move: 0.4, punch: 0.5, eject: 0.5,
  speed: 170, push: 0.5,
  queue: 0.5, intake: 0.7, work: [5.5, 7.0, 8.5], out: 0.7,
  belt: 26, gap: 34,
  firstForm: 0.6, minGap: 2.0, pending: 2, maxPending: 5,
};
const FORM = T.feed + T.press + T.fold + T.move + T.punch; // 3.0 s before eject

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (v) => { const t = clamp(v); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const span = (t, a, d) => clamp((t - a) / d);

// Three tasks already wait in the hopper when the demo starts.
const START = [-9, -6, -3];

// Schedule every task from its arrival time. Resources are FIFO: former, shuttle, each agent,
// the two queue slots of each lane and the output belt (a result waits for a clear gap).
function simulate(arrivals) {
  const tasks = [...arrivals].sort((a, b) => a - b).map((arrive, n) => {
    const s = STREAM[n % STREAM.length];
    return { n, seed: s.seed, agent: s.agent, arrive, hopper: arrive + T.chute + T.drop };
  });
  let formerFree = T.firstForm, shuttleFree = -Infinity;
  const agentFree = [-Infinity, -Infinity, -Infinity], laneJobs = [[], [], []], results = [];
  for (const k of tasks) {
    k.form = Math.max(k.hopper, formerFree);
    k.eject = Math.max(k.form + FORM, shuttleFree);
    k.formed = k.eject + T.eject;                    // on the shuttle: a uniform coded card
    formerFree = k.formed;
    const x = L.lanes[k.agent], travel = Math.abs(x - L.pickup) / T.speed + 0.25;
    k.travel = travel;
    k.atLane = k.formed + travel;
    // A lane holds two cards; the shuttle waits until the second slot is free.
    const jobs = laneJobs[k.agent];
    const blocker = jobs.length >= 2 ? jobs[jobs.length - 2].start : -Infinity;
    k.pushAt = Math.max(k.atLane, blocker);
    k.dropped = k.pushAt + T.push;
    shuttleFree = k.dropped + travel;
    const prev = jobs[jobs.length - 1];
    k.front = Math.max(k.dropped, prev ? prev.start : -Infinity);   // first in its lane from here
    k.start = Math.max(k.front + T.queue, agentFree[k.agent]);
    let out = k.start + T.intake + T.work[k.agent];
    const xa = L.lanes[k.agent];
    const at = (r, t) => (t < r.onBelt ? r.x : r.x + T.belt * (t - r.onBelt));
    // Only results still on the belt can block this one (keeps the schedule linear in time).
    // (`form` only grows from task to task, and every later result leaves the agent after it.)
    while (results.length && results[0].gone < k.form) results.shift();
    for (;;) {
      const busy = results.some((r) => [0.3, 0.5, 0.7].some((d) => Math.abs(at(r, out + d) - xa) < T.gap));
      if (!busy) break;
      out += 0.1;
    }
    k.out = Math.round(out * 1000) / 1000;
    k.onBelt = k.out + T.out;
    k.x = xa;
    k.gone = k.onBelt + (L.belt.fade1 - xa) / T.belt;
    agentFree[k.agent] = k.onBelt;
    jobs.push(k);
    results.push(k);
  }
  return tasks;
}

// Tour policy: drop a new task whenever two or fewer are still before the former and the
// last one arrived at least two seconds ago.
function pendingAt(tasks, t) { return tasks.filter((k) => k.arrive <= t && k.form > t).length; }
function wantsArrival(tasks, t) {
  const last = tasks.length ? Math.max(...tasks.map((k) => k.arrive)) : -Infinity;
  return t - last >= T.minGap && pendingAt(tasks, t) <= T.pending;
}
function canDrop(tasks, t) { return pendingAt(tasks, t) < T.maxPending; }
function tourUntil(until, arrivals = START.slice(), step = 0.1) {
  let tasks = simulate(arrivals);
  for (let t = 0; t <= until + 1e-9; t = Math.round((t + step) * 1000) / 1000) {
    if (wantsArrival(tasks, t)) { arrivals.push(t); tasks = simulate(arrivals); }
  }
  return arrivals;
}

// Everything the drawing needs at time t.
function stateAt(tasks, t) {
  const S = {
    t, inlet: [], hopper: [], former: [], shuttle: [], lanes: [[], [], []], agents: [[], [], []], belt: [],
    press: 0, fold: 0, punch: 0, roll: 0, shuttleX: L.pickup, pusher: 0,
    stamp: 0, rollB: 0, lift: 0, count: 0, countF: 0, word: 'idle', busy: [false, false, false],
    counts: { received: 0, formed: 0, done: 0 },
  };
  const pile = [];
  for (const k of tasks) {
    if (k.arrive > t) continue;
    if (t >= k.hopper) S.counts.received++;
    if (t >= k.formed) S.counts.formed++;
    if (t >= k.onBelt) S.counts.done++;
    if (k.agent === 2) { const c = ease((t - (k.start + T.intake + T.work[2] * 0.55)) / 0.6); S.countF += c; if (c >= 1) S.count++; }
    if (t >= k.gone) continue;
    if (t < k.hopper) {                                        // on the inlet chute, then falling
      const u = span(t, k.arrive, T.chute);
      const x = lerp(L.chute.x0, L.chute.x1 + 12, u);
      const f = span(t, k.arrive + T.chute, T.drop);
      S.inlet.push({ id: k.n, art: 'm' + k.seed, at: [x + 6 * f, L.chute.y, L.chute.z + 1 - (L.chute.z - L.hopper.floor - 7) * f * f] });
    } else if (t < k.form + T.feed) {
      pile.push(k);
    }
    if (t >= k.form && t < k.formed) formerState(S, k, t);
    if (t >= k.eject && t < k.dropped) shuttleState(S, k, t);
    else if (t >= k.dropped && t < k.dropped + k.travel) S.shuttleX = lerp(L.lanes[k.agent], L.pickup, ease((t - k.dropped) / k.travel));
    laneState(S, k, t);
    if (t >= k.start && t < k.onBelt) agentState(S, k, t);
    if (t >= k.out) beltState(S, k, t);
  }
  // Hopper pile: the oldest is at the bottom and leaves first; the pile settles down by one.
  pile.sort((a, b) => a.hopper - b.hopper);
  let level = 0;
  pile.forEach((k) => {
    const leaving = t >= k.form;
    if (leaving) { feedState(S, k, t); return; }
    const settle = ease((t - k.hopper) / 0.4);
    const z = L.hopper.floor + 0.6 + level * 2.6 + (1 - settle) * 6;
    S.hopper.push({ id: k.n, art: 'm' + k.seed, at: [L.hopper.x + jitter(k.seed, 0), L.hopper.y + jitter(k.seed, 1), z] });
    level++;
  });
  return S;
}

const jitter = (seed, axis) => [[-3, 2], [4, -2], [-1, 4], [3, 3], [-4, -3], [2, -4], [0, 3], [-3, 0], [4, 1]][seed % 9][axis];

function feedState(S, k, t) {
  // The task slides out of the hopper outlet, under the feed rollers, onto the press bed.
  const u = ease(span(t, k.form, T.feed));
  const x = lerp(L.hopper.x + 4, L.former.press, u);
  const z = lerp(L.hopper.floor + 0.6, L.work, ease(u * 1.6));
  S.former.push({ id: k.n, art: 'm' + k.seed + 'L', at: [x, L.hopper.y, z] });
  S.roll += u * 6;
  S.word = 'feeding';
}

function formerState(S, k, t) {
  const r = t - k.form;
  const p0 = T.feed, p1 = p0 + T.press, p2 = p1 + T.fold, p3 = p2 + T.move, p4 = p3 + T.punch;
  if (r < p0) return;                                          // feedState draws the feed
  const y = L.hopper.y;
  if (r < p1) {
    const u = (r - p0) / T.press;
    S.press = u < 0.35 ? ease(u / 0.35) : u < 0.65 ? 1 : 1 - ease((u - 0.65) / 0.35);
    const morph = ease((u - 0.4) / 0.2);
    if (morph < 1) S.former.push({ id: k.n, art: 'm' + k.seed + 'L', at: [L.former.press, y, L.work], opacity: 1 - morph });
    if (morph > 0) S.former.push({ id: k.n + 0.5, art: 'cL', at: [L.former.press, y, L.work], opacity: morph });
    S.word = 'pressing';
  } else if (r < p2) {
    const u = (r - p1) / T.fold;
    S.fold = u < 0.5 ? ease(u / 0.5) : 1 - ease((u - 0.5) / 0.5);
    S.former.push({ id: k.n + 0.5, art: 'cL', at: [L.former.press, y, L.work] });
    S.word = 'squaring';
  } else if (r < p4) {
    const m = ease((r - p2) / T.move);
    const u = clamp((r - p3) / T.punch);
    S.punch = r < p3 ? 0 : u < 0.4 ? ease(u / 0.4) : 1 - ease((u - 0.4) / 0.6);
    const holed = r >= p3 + T.punch * 0.4;
    S.former.push({ id: k.n + 0.5, art: holed ? 'c' + k.agent + 'L' : 'cL', at: [lerp(L.former.press, L.former.punch, m), y, L.work] });
    S.word = r < p3 ? 'squaring' : 'punching';
  } else if (t < k.eject) {
    S.former.push({ id: k.n + 0.5, art: 'c' + k.agent + 'L', at: [L.former.punch, y, L.work] });
    S.word = 'waiting';
  } else {
    const u = ease((t - k.eject) / T.eject);
    S.former.push({ id: k.n + 0.5, art: 'c' + k.agent + 'L', at: [lerp(L.former.punch, L.pickup, u), y, L.work] });
    S.word = 'handing';
  }
  S.roll += Math.min(r, p0) * 6 / p0;
}

// The shuttle carries the card along the rail to its lane and the pusher slides it off.
function shuttleState(S, k, t) {
  const x = L.lanes[k.agent];
  if (t < k.formed) { S.shuttleX = L.pickup; return; }
  if (t < k.pushAt) {
    S.shuttleX = lerp(L.pickup, x, ease((t - k.formed) / k.travel));
    S.shuttle.push({ id: k.n, art: 'c' + k.agent, at: [0, 0, 0] });
    return;
  }
  S.shuttleX = x;
  const u = (t - k.pushAt) / T.push;
  S.pusher = u < 0.6 ? ease(u / 0.6) : 1 - ease((u - 0.6) / 0.4);
  S.shuttle.push({ id: k.n, art: 'c' + k.agent, at: [0, (L.lane.drop - L.hopper.y) * ease(u / 0.8), 0] });
}

function laneState(S, k, t) {
  if (t < k.dropped || t >= k.start) return;                   // on the shuttle, or in the agent
  const y = lerp(L.lane.drop, L.lane.wait, ease((t - k.front) / T.queue));
  S.lanes[k.agent].push({ id: k.n, art: 'c' + k.agent, at: [L.lanes[k.agent], y, L.work] });
}

// Each agent: its own mechanism and its own result.
function agentState(S, k, t) {
  const a = k.agent, x = L.lanes[a], r = t - k.start, w = T.work[a];
  S.busy[a] = true;
  const item = (art, y, opacity = 1, z = L.work) => S.agents[a].push({ id: k.n, art, at: [x, y, z], opacity });
  if (r < T.intake) {
    item('c' + a, lerp(L.lane.wait, L.agent.work, ease(r / T.intake)));
    return;
  }
  const u = (r - T.intake) / w;
  if (a === 0) {                       // stamp press: two strokes fold and seal an envelope
    const stroke = (v) => (v < 0.3 ? ease(v / 0.3) : v < 0.5 ? 1 : 1 - ease((v - 0.5) / 0.5));
    S.stamp = u < 0.45 ? stroke(u / 0.45) : u < 0.9 ? stroke((u - 0.45) / 0.45) : 0;
    const m = ease((u - 0.25) / 0.15);
    if (t < k.out) {
      if (m < 1) item('c0', L.agent.work, 1 - m);
      if (m > 0) item('r0', L.agent.work, m);
    }
  } else if (a === 1) {                // roller pair: the card is drawn through and bound
    S.rollB = u * 40;
    const y = lerp(L.agent.work - 14, L.agent.work + 14, ease(u));
    const m = ease((u - 0.45) / 0.15);
    if (t < k.out) {
      if (m < 1) item('c1', y, 1 - m);
      if (m > 0) item('r1', y, m);
    }
  } else {                             // elevator packer: card goes down, a box comes up
    S.lift = u < 0.4 ? ease(u / 0.4) : u < 0.6 ? 1 : 1 - ease((u - 0.6) / 0.4);
    const z = L.work - 14 * S.lift;
    if (t < k.out) item(u < 0.5 ? 'c2' : 'r2', L.agent.work, 1, z);
  }
}

function beltState(S, k, t) {
  const a = k.agent, x0 = L.lanes[a];
  let x = x0, y;
  if (t < k.onBelt) {
    const u = ease((t - k.out) / T.out);
    y = lerp(L.agent.work, L.belt.y, u);
  } else {
    y = L.belt.y;
    x = x0 + T.belt * (t - k.onBelt);
  }
  const fade = 1 - ease((x - L.belt.fade0) / (L.belt.fade1 - L.belt.fade0));
  S.belt.push({ id: k.n, art: 'r' + a, at: [x, y, L.work], opacity: fade, onBelt: t >= k.onBelt });
}

const WORDS = {
  en: { idle: 'waiting', feeding: 'feeding', pressing: 'pressing', squaring: 'squaring', punching: 'punching', waiting: 'waiting for shuttle', handing: 'handing over' },
  ua: { idle: 'чекає', feeding: 'подає', pressing: 'пресує', squaring: 'вирівнює', punching: 'пробиває код', waiting: 'чекає човник', handing: 'передає' },
};
function readout(S, lang) {
  const c = S.counts, w = WORDS[lang][S.word] || WORDS[lang].idle;
  return lang === 'ua'
    ? `надійшло ${c.received} · оформлено ${c.formed} · виконано ${c.done} · ${w}`
    : `received ${c.received} · formed ${c.formed} · done ${c.done} · ${w}`;
}
function describe(S, lang) {
  const busy = S.busy.map((b, i) => (b ? i + 1 : 0)).filter(Boolean);
  const agents = lang === 'ua'
    ? (busy.length ? 'працюють: ' + busy.map((i) => 'агент ' + i).join(', ') : 'агенти вільні')
    : (busy.length ? 'working: ' + busy.map((i) => 'agent ' + i).join(', ') : 'agents idle');
  return readout(S, lang) + ' · ' + agents;
}

// The reduced-motion still: the first moment of the default tour where a task waits in the
// hopper, the one being formed is in plain view (fed, squared or punched, not under the platen),
// a coded card rides the shuttle or waits on a lane, all three agents hold work and at least
// two finished results are on the belt.
function findStill(until = 240) {
  const tasks = simulate(tourUntil(until));
  for (let t = 10; t < until; t = Math.round((t + 0.05) * 100) / 100) {
    const S = stateAt(tasks, t);
    if (S.hopper.length && ['feeding', 'squaring', 'punching'].includes(S.word) && S.former.some((f) => f.art.endsWith('L')) &&
      (S.shuttle.length || S.lanes.some((l) => l.length)) && S.agents.every((a) => a.length) &&
      S.belt.filter((b) => b.onBelt && b.opacity > 0.75).length >= 2) return Math.round(t * 100) / 100;
  }
  return null;
}

// Moving parts, shared by build.mjs (initial and still markup) and the live script (each frame).
// Only kit functions are used, so the file inlines into live.js with its imports stripped.



const view = (P) => { const a = (P.azimuth ?? 45) * Math.PI / 180, e = (P.elevation ?? 30) * Math.PI / 180; return [Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), Math.sin(e)]; };

// Ribs on a roller (axis along x or y) turned by `angle`; each fades out toward the limbs.
function ribsSvg(c, axis, r, half, angle, count, P) {
  const V = view(P), out = [];
  const u = axis === 'x' ? [0, 1, 0] : [1, 0, 0], w = [0, 0, 1], a = axis === 'x' ? [1, 0, 0] : [0, 1, 0];
  for (let i = 0; i < count; i++) {
    const f = angle + i * 2 * Math.PI / count, n = [u[0] * Math.cos(f) + w[0] * Math.sin(f), u[1] * Math.cos(f) + w[1] * Math.sin(f), Math.sin(f)];
    const face = n[0] * V[0] + n[1] * V[1] + n[2] * V[2];
    if (face < 0.15) continue;
    const p = (s) => iso([c[0] + n[0] * r + a[0] * s, c[1] + n[1] * r + a[1] * s, c[2] + n[2] * r + a[2] * s], P);
    out.push([pathOf([p(-half), p(half)]), Math.min(1, (face - 0.15) / 0.35)]);
  }
  return fadedSvg(out, { tone: 'lo' });
}

// Spokes on a gear face that lies in the plane x = c[0] (seen from +x), turned by `angle`.
function spokesSvg(c, r0, r1, angle, count, P) {
  let d = '';
  for (let i = 0; i < count; i++) {
    const f = angle + i * 2 * Math.PI / count, cy = Math.cos(f), cz = Math.sin(f);
    d += pathOf([iso([c[0], c[1] + cy * r0, c[2] + cz * r0], P), iso([c[0], c[1] + cy * r1, c[2] + cz * r1], P)]);
  }
  // Rim and hub rings on the face, so every spoke ends on a line.
  const ring = (r) => pathOf(Array.from({ length: 36 }, (_, i) => iso([c[0], c[1] + Math.cos(i * Math.PI / 18) * r, c[2] + Math.sin(i * Math.PI / 18) * r], P)), true);
  return lineSvg(d, { tone: 'lo' }) + lineSvg(ring(r1) + ring(r0), { tone: 'faint' });
}

// The counter needle on agent 3's dial: one tenth of a turn per box.
function needleSvg(c, r, count, P) {
  const f = count * 2 * Math.PI / 10 - Math.PI / 2;
  const tip = [c[0] + Math.cos(f) * r, c[1] + Math.sin(f) * r, c[2]], tail = [c[0] - Math.cos(f) * 1.6, c[1] - Math.sin(f) * 1.6, c[2]];
  return lineSvg(pathOf([iso(tail, P), iso(tip, P)]), { tone: 'hi', free: true }).replace('class="iso-line"', 'class="iso-line" stroke-width="1.1"');
}

// Slats of the output belt, moving with it. Closed outlines, so no line ends anywhere.
function slatsSvg(t, P) {
  let d = '';
  const step = 14, off = ((t * 26) % step + step) % step;
  for (let x = L.belt.x0 + 4 + off; x < L.belt.end - 4; x += step) d += planOutline({ x, y: L.belt.y - 11, w: 3, d: 22, r: 1 }, L.work, P, 2);
  return lineSvg(d, { tone: 'faint' });
}

const itemSvg = (it, ART, P) => `<g data-item="${it.id}" data-art="${it.art}" transform="${translateAlong(P, it.at)}"${it.opacity != null && it.opacity < 1 ? ` opacity="${it.opacity.toFixed(3)}"` : ''}>${ART[it.art]}</g>`;

// Positions of the rigid moving groups and markup of the parts rebuilt each frame.
function poseOf(S, P) {
  const A = L.lanes;
  return {
    move: {
      press: [0, 0, -16 * S.press],
      'fold-rear': [0, 7 * S.fold, 0],
      'fold-front': [0, -7 * S.fold, 0],
      punch: [0, 0, -9 * S.punch],
      shuttle: [S.shuttleX - L.pickup, 0, 0],
      pusher: [0, 22 * S.pusher, 0],
      stamp: [0, 0, -14 * S.stamp],
      lift: [0, 0, -14 * S.lift],
    },
    html: {
      'feed-ribs': ribsSvg([L.former.feed, L.hopper.y, L.work + 1.6 + 4.2], 'y', 4.2, 19, -S.roll, 10, P),
      'roll-ribs': ribsSvg([A[1], L.agent.work, L.work + 1.6 + 6], 'x', 6, 18.5, S.rollB, 12, P),
      'gear-spokes': spokesSvg([A[1] + 27, L.agent.work, 34], 2.4, 7.4, -S.rollB * 0.66, 6, P),
      needle: needleSvg([A[2] + 19, 33, L.work + 4], 4.8, S.countF, P),
      'fly-spokes': spokesSvg([-171, -17, 16], 3, 11.6, -S.t * 1.6, 5, P),
      slats: slatsSvg(S.t, P),
    },
  };
}

// Items in each reserved paint slot, in drawing order.
function slotsOf(S) {
  const shuttle = S.shuttle.map((it) => ({ ...it, at: [L.pickup + it.at[0], L.hopper.y + it.at[1], L.work + it.at[2]] }));
  const belt = [...S.belt].sort((a, b) => a.at[0] - b.at[0]);
  return {
    inlet: S.inlet, hopper: S.hopper, former: S.former, shuttle,
    'lane-0': S.lanes[0], 'lane-1': S.lanes[1], 'lane-2': S.lanes[2],
    'agent-0': S.agents[0], 'agent-1': S.agents[1], 'agent-2': S.agents[2], belt,
  };
}

const P={"origin":[474.1620312329628,310.15026317968324],"scale":1.0929850874134652,"azimuth":64,"elevation":50},ART={"m0":"<g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M456.8 303.9L460.5 299.1L467.6 295.2L476.4 297.5L487.4 301.9L489.7 313.2L489.7 316.1L481.7 319L475.9 319.1L466.7 317.2L461.6 312.9L456.8 306.7Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M489.7 316.1L481.7 319L481.7 316.2L489.7 313.2ZM481.7 319L475.9 319.1L475.9 316.3L481.7 316.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M475.9 319.1L466.7 317.2L466.7 314.3L475.9 316.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M466.7 317.2L461.6 312.9L461.6 310.1L466.7 314.3ZM461.6 312.9L456.8 306.7L456.8 303.9L461.6 310.1Z\"/><path class=\"iso-top\" d=\"M489.7 313.2L481.7 316.2L475.9 316.3L466.7 314.3L461.6 310.1L456.8 303.9L460.5 299.1L467.6 295.2L476.4 297.5L487.4 301.9L488.3 307.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M489.7 313.2L481.7 316.2L475.9 316.3L466.7 314.3L461.6 310.1L456.8 303.9\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M456.8 303.9L460.5 299.1L467.6 295.2L476.4 297.5L487.4 301.9L488.3 307.9L489.7 313.2M489.7 316.1L481.7 319L475.9 319.1L466.7 317.2L461.6 312.9L456.8 306.7M489.7 313.2L489.7 316.1M456.8 303.9L456.8 306.7\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M486.5 314.4L459.1 301M471.3 315.3L480.8 299.2M463.1 311.4L487.6 303.7\"/>","m0L":"<g class=\"iso-solid\" data-lit=\"\"><path class=\"iso-fill\" d=\"M456.8 303.9L460.5 299.1L467.6 295.2L476.4 297.5L487.4 301.9L489.7 313.2L489.7 316.1L481.7 319L475.9 319.1L466.7 317.2L461.6 312.9L456.8 306.7Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M489.7 316.1L481.7 319L481.7 316.2L489.7 313.2ZM481.7 319L475.9 319.1L475.9 316.3L481.7 316.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M475.9 319.1L466.7 317.2L466.7 314.3L475.9 316.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M466.7 317.2L461.6 312.9L461.6 310.1L466.7 314.3ZM461.6 312.9L456.8 306.7L456.8 303.9L461.6 310.1Z\"/><path class=\"iso-top\" d=\"M489.7 313.2L481.7 316.2L475.9 316.3L466.7 314.3L461.6 310.1L456.8 303.9L460.5 299.1L467.6 295.2L476.4 297.5L487.4 301.9L488.3 307.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M489.7 313.2L481.7 316.2L475.9 316.3L466.7 314.3L461.6 310.1L456.8 303.9\"/><path class=\"iso-line iso-edge\" data-tone=\"lit\" d=\"M456.8 303.9L460.5 299.1L467.6 295.2L476.4 297.5L487.4 301.9L488.3 307.9L489.7 313.2M489.7 316.1L481.7 319L475.9 319.1L466.7 317.2L461.6 312.9L456.8 306.7M489.7 313.2L489.7 316.1M456.8 303.9L456.8 306.7\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M486.5 314.4L459.1 301M471.3 315.3L480.8 299.2M463.1 311.4L487.6 303.7\"/>","m1":"<g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M462.2 303.2L463.8 296.1L470.7 294.3L479.3 294.8L484.1 300.9L488.9 309.7L488.9 312.5L481.1 322.3L472.5 320.7L467.9 317.9L462.6 311.9L462.2 306.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M488.9 312.5L484.5 317.6L484.5 314.7L488.9 309.7ZM484.5 317.6L481.1 322.3L481.1 319.5L484.5 314.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M481.1 322.3L472.5 320.7L472.5 317.8L481.1 319.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M472.5 320.7L467.9 317.9L467.9 315L472.5 317.8ZM467.9 317.9L462.6 311.9L462.6 309L467.9 315ZM462.6 311.9L462.2 306.1L462.2 303.2L462.6 309Z\"/><path class=\"iso-top\" d=\"M481.1 319.5L472.5 317.8L467.9 315L462.6 309L462.2 303.2L463.8 296.1L470.7 294.3L479.3 294.8L484.1 300.9L488.9 309.7L484.5 314.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M488.9 309.7L484.5 314.7L481.1 319.5L472.5 317.8L467.9 315L462.6 309L462.2 303.2\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M462.2 303.2L463.8 296.1L470.7 294.3L479.3 294.8L484.1 300.9L488.9 309.7M488.9 312.5L484.5 317.6L481.1 322.3L472.5 320.7L467.9 317.9L462.6 311.9L462.2 306.1M462.2 303.2L462.2 306.1M488.9 309.7L488.9 312.5\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M477.7 318.8L467.9 295M465.3 312L486 304.4M462.3 305L487.5 311.2\"/>","m1L":"<g class=\"iso-solid\" data-lit=\"\"><path class=\"iso-fill\" d=\"M462.2 303.2L463.8 296.1L470.7 294.3L479.3 294.8L484.1 300.9L488.9 309.7L488.9 312.5L481.1 322.3L472.5 320.7L467.9 317.9L462.6 311.9L462.2 306.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M488.9 312.5L484.5 317.6L484.5 314.7L488.9 309.7ZM484.5 317.6L481.1 322.3L481.1 319.5L484.5 314.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M481.1 322.3L472.5 320.7L472.5 317.8L481.1 319.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M472.5 320.7L467.9 317.9L467.9 315L472.5 317.8ZM467.9 317.9L462.6 311.9L462.6 309L467.9 315ZM462.6 311.9L462.2 306.1L462.2 303.2L462.6 309Z\"/><path class=\"iso-top\" d=\"M481.1 319.5L472.5 317.8L467.9 315L462.6 309L462.2 303.2L463.8 296.1L470.7 294.3L479.3 294.8L484.1 300.9L488.9 309.7L484.5 314.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M488.9 309.7L484.5 314.7L481.1 319.5L472.5 317.8L467.9 315L462.6 309L462.2 303.2\"/><path class=\"iso-line iso-edge\" data-tone=\"lit\" d=\"M462.2 303.2L463.8 296.1L470.7 294.3L479.3 294.8L484.1 300.9L488.9 309.7M488.9 312.5L484.5 317.6L481.1 322.3L472.5 320.7L467.9 317.9L462.6 311.9L462.2 306.1M462.2 303.2L462.2 306.1M488.9 309.7L488.9 312.5\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M477.7 318.8L467.9 295M465.3 312L486 304.4M462.3 305L487.5 311.2\"/>","m2":"<g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M462.9 310.1L463.8 302.9L468.5 298.3L475.6 293.6L482.5 295.6L488.6 300.3L488.6 303.1L487.2 310.1L483.4 319.2L469.2 322.9L464 317.4L462.9 313Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M488.6 303.1L487.2 310.1L487.2 307.3L488.6 300.3ZM487.2 310.1L483.4 319.2L483.4 316.4L487.2 307.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M483.4 319.2L475.8 320.9L475.8 318.1L483.4 316.4ZM475.8 320.9L469.2 322.9L469.2 320.1L475.8 318.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M469.2 322.9L464 317.4L464 314.5L469.2 320.1ZM464 317.4L462.9 313L462.9 310.1L464 314.5Z\"/><path class=\"iso-top\" d=\"M469.2 320.1L464 314.5L462.9 310.1L463.8 302.9L468.5 298.3L475.6 293.6L482.5 295.6L488.6 300.3L487.2 307.3L483.4 316.4L475.8 318.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M488.6 300.3L487.2 307.3L483.4 316.4L475.8 318.1L469.2 320.1L464 314.5L462.9 310.1\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M462.9 310.1L463.8 302.9L468.5 298.3L475.6 293.6L482.5 295.6L488.6 300.3M488.6 303.1L487.2 310.1L483.4 319.2L475.8 320.9L469.2 322.9L464 317.4L462.9 313M462.9 310.1L462.9 313M488.6 300.3L488.6 303.1\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M467.1 317.8L479.7 294.8M463.4 306.5L485.7 310.9M467.1 299.7L481.1 316.9\"/>","m2L":"<g class=\"iso-solid\" data-lit=\"\"><path class=\"iso-fill\" d=\"M462.9 310.1L463.8 302.9L468.5 298.3L475.6 293.6L482.5 295.6L488.6 300.3L488.6 303.1L487.2 310.1L483.4 319.2L469.2 322.9L464 317.4L462.9 313Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M488.6 303.1L487.2 310.1L487.2 307.3L488.6 300.3ZM487.2 310.1L483.4 319.2L483.4 316.4L487.2 307.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M483.4 319.2L475.8 320.9L475.8 318.1L483.4 316.4ZM475.8 320.9L469.2 322.9L469.2 320.1L475.8 318.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M469.2 322.9L464 317.4L464 314.5L469.2 320.1ZM464 317.4L462.9 313L462.9 310.1L464 314.5Z\"/><path class=\"iso-top\" d=\"M469.2 320.1L464 314.5L462.9 310.1L463.8 302.9L468.5 298.3L475.6 293.6L482.5 295.6L488.6 300.3L487.2 307.3L483.4 316.4L475.8 318.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M488.6 300.3L487.2 307.3L483.4 316.4L475.8 318.1L469.2 320.1L464 314.5L462.9 310.1\"/><path class=\"iso-line iso-edge\" data-tone=\"lit\" d=\"M462.9 310.1L463.8 302.9L468.5 298.3L475.6 293.6L482.5 295.6L488.6 300.3M488.6 303.1L487.2 310.1L483.4 319.2L475.8 320.9L469.2 322.9L464 317.4L462.9 313M462.9 310.1L462.9 313M488.6 300.3L488.6 303.1\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M467.1 317.8L479.7 294.8M463.4 306.5L485.7 310.9M467.1 299.7L481.1 316.9\"/>","m3":"<g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M459.7 314.6L460.4 307.8L463.2 303.9L470 298.8L477.4 297.6L486.8 297.6L490.3 302.5L491.1 309L491.1 311.9L484.2 316.6L473.6 321.6L459.7 317.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M491.1 311.9L484.2 316.6L484.2 313.7L491.1 309ZM484.2 316.6L473.6 321.6L473.6 318.8L484.2 313.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M473.6 321.6L466.4 319.2L466.4 316.3L473.6 318.8ZM466.4 319.2L459.7 317.5L459.7 314.6L466.4 316.3Z\"/><path class=\"iso-top\" d=\"M459.7 314.6L460.4 307.8L463.2 303.9L470 298.8L477.4 297.6L486.8 297.6L490.3 302.5L491.1 309L484.2 313.7L473.6 318.8L466.4 316.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M491.1 309L484.2 313.7L473.6 318.8L466.4 316.3L459.7 314.6\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M459.7 314.6L460.4 307.8L463.2 303.9L470 298.8L477.4 297.6L486.8 297.6L490.3 302.5L491.1 309M491.1 311.9L484.2 316.6L473.6 321.6L466.4 319.2L459.7 317.5M459.7 314.6L459.7 317.5M491.1 309L491.1 311.9\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M459.9 311.9L488.9 300.5M466.6 301.4L479.9 315.8M475.2 298L471.5 318.1\"/>","m3L":"<g class=\"iso-solid\" data-lit=\"\"><path class=\"iso-fill\" d=\"M459.7 314.6L460.4 307.8L463.2 303.9L470 298.8L477.4 297.6L486.8 297.6L490.3 302.5L491.1 309L491.1 311.9L484.2 316.6L473.6 321.6L459.7 317.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M491.1 311.9L484.2 316.6L484.2 313.7L491.1 309ZM484.2 316.6L473.6 321.6L473.6 318.8L484.2 313.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M473.6 321.6L466.4 319.2L466.4 316.3L473.6 318.8ZM466.4 319.2L459.7 317.5L459.7 314.6L466.4 316.3Z\"/><path class=\"iso-top\" d=\"M459.7 314.6L460.4 307.8L463.2 303.9L470 298.8L477.4 297.6L486.8 297.6L490.3 302.5L491.1 309L484.2 313.7L473.6 318.8L466.4 316.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M491.1 309L484.2 313.7L473.6 318.8L466.4 316.3L459.7 314.6\"/><path class=\"iso-line iso-edge\" data-tone=\"lit\" d=\"M459.7 314.6L460.4 307.8L463.2 303.9L470 298.8L477.4 297.6L486.8 297.6L490.3 302.5L491.1 309M491.1 311.9L484.2 316.6L473.6 321.6L466.4 319.2L459.7 317.5M459.7 314.6L459.7 317.5M491.1 309L491.1 311.9\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M459.9 311.9L488.9 300.5M466.6 301.4L479.9 315.8M475.2 298L471.5 318.1\"/>","m4":"<g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M456.9 305.7L463.2 300.9L468.6 299.3L478.1 298.8L484.8 301.5L492 306.1L492 308.9L490.6 314.4L485.7 319.8L476.4 320L464.1 318.7L456.9 308.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M492 308.9L490.6 314.4L490.6 311.6L492 306.1ZM490.6 314.4L485.7 319.8L485.7 317L490.6 311.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M485.7 319.8L476.4 320L476.4 317.2L485.7 317Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M476.4 320L464.1 318.7L464.1 315.8L476.4 317.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M464.1 318.7L460.6 313.2L460.6 310.4L464.1 315.8ZM460.6 313.2L456.9 308.6L456.9 305.7L460.6 310.4Z\"/><path class=\"iso-top\" d=\"M456.9 305.7L463.2 300.9L468.6 299.3L478.1 298.8L484.8 301.5L492 306.1L490.6 311.6L485.7 317L476.4 317.2L464.1 315.8L460.6 310.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M492 306.1L490.6 311.6L485.7 317L476.4 317.2L464.1 315.8L460.6 310.4L456.9 305.7\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M456.9 305.7L463.2 300.9L468.6 299.3L478.1 298.8L484.8 301.5L492 306.1M492 308.9L490.6 314.4L485.7 319.8L476.4 320L464.1 318.7L460.6 313.2L456.9 308.6M456.9 305.7L456.9 308.6M492 306.1L492 308.9\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M459.4 303.8L491.2 309.4M473.4 299L471.5 316.6M482.8 300.7L463 314.2\"/>","m4L":"<g class=\"iso-solid\" data-lit=\"\"><path class=\"iso-fill\" d=\"M456.9 305.7L463.2 300.9L468.6 299.3L478.1 298.8L484.8 301.5L492 306.1L492 308.9L490.6 314.4L485.7 319.8L476.4 320L464.1 318.7L456.9 308.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M492 308.9L490.6 314.4L490.6 311.6L492 306.1ZM490.6 314.4L485.7 319.8L485.7 317L490.6 311.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M485.7 319.8L476.4 320L476.4 317.2L485.7 317Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M476.4 320L464.1 318.7L464.1 315.8L476.4 317.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M464.1 318.7L460.6 313.2L460.6 310.4L464.1 315.8ZM460.6 313.2L456.9 308.6L456.9 305.7L460.6 310.4Z\"/><path class=\"iso-top\" d=\"M456.9 305.7L463.2 300.9L468.6 299.3L478.1 298.8L484.8 301.5L492 306.1L490.6 311.6L485.7 317L476.4 317.2L464.1 315.8L460.6 310.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M492 306.1L490.6 311.6L485.7 317L476.4 317.2L464.1 315.8L460.6 310.4L456.9 305.7\"/><path class=\"iso-line iso-edge\" data-tone=\"lit\" d=\"M456.9 305.7L463.2 300.9L468.6 299.3L478.1 298.8L484.8 301.5L492 306.1M492 308.9L490.6 314.4L485.7 319.8L476.4 320L464.1 318.7L460.6 313.2L456.9 308.6M456.9 305.7L456.9 308.6M492 306.1L492 308.9\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M459.4 303.8L491.2 309.4M473.4 299L471.5 316.6M482.8 300.7L463 314.2\"/>","m5":"<g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M459.3 308.9L462.3 297.6L471.1 297L476.7 298.5L484.3 302.7L487.2 308.1L488.8 315.2L488.8 318L483.2 321.5L474.8 323.2L467.6 318.8L459.3 311.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M488.8 318L483.2 321.5L483.2 318.7L488.8 315.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M483.2 321.5L474.8 323.2L474.8 320.4L483.2 318.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M474.8 323.2L467.6 318.8L467.6 315.9L474.8 320.4ZM467.6 318.8L459.3 311.7L459.3 308.9L467.6 315.9Z\"/><path class=\"iso-top\" d=\"M462.3 297.6L471.1 297L476.7 298.5L484.3 302.7L487.2 308.1L488.8 315.2L483.2 318.7L474.8 320.4L467.6 315.9L459.3 308.9L461.2 303Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M488.8 315.2L483.2 318.7L474.8 320.4L467.6 315.9L459.3 308.9\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M459.3 308.9L461.2 303L462.3 297.6L471.1 297L476.7 298.5L484.3 302.7L487.2 308.1L488.8 315.2M488.8 318L483.2 321.5L474.8 323.2L467.6 318.8L459.3 311.7M488.8 315.2L488.8 318M459.3 308.9L459.3 311.7\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M465.8 297.3L485.4 317.3M480.5 300.6L464.3 313.1M486.4 306.5L459.9 307.1\"/>","m5L":"<g class=\"iso-solid\" data-lit=\"\"><path class=\"iso-fill\" d=\"M459.3 308.9L462.3 297.6L471.1 297L476.7 298.5L484.3 302.7L487.2 308.1L488.8 315.2L488.8 318L483.2 321.5L474.8 323.2L467.6 318.8L459.3 311.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M488.8 318L483.2 321.5L483.2 318.7L488.8 315.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M483.2 321.5L474.8 323.2L474.8 320.4L483.2 318.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M474.8 323.2L467.6 318.8L467.6 315.9L474.8 320.4ZM467.6 318.8L459.3 311.7L459.3 308.9L467.6 315.9Z\"/><path class=\"iso-top\" d=\"M462.3 297.6L471.1 297L476.7 298.5L484.3 302.7L487.2 308.1L488.8 315.2L483.2 318.7L474.8 320.4L467.6 315.9L459.3 308.9L461.2 303Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M488.8 315.2L483.2 318.7L474.8 320.4L467.6 315.9L459.3 308.9\"/><path class=\"iso-line iso-edge\" data-tone=\"lit\" d=\"M459.3 308.9L461.2 303L462.3 297.6L471.1 297L476.7 298.5L484.3 302.7L487.2 308.1L488.8 315.2M488.8 318L483.2 321.5L474.8 323.2L467.6 318.8L459.3 311.7M488.8 315.2L488.8 318M459.3 308.9L459.3 311.7\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M465.8 297.3L485.4 317.3M480.5 300.6L464.3 313.1M486.4 306.5L459.9 307.1\"/>","m6":"<g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M461.5 301.2L473.3 294L480.5 297.9L483.5 301.8L485.8 308.8L485.8 311.7L483.5 317.2L478.7 323.4L471.5 323.3L463.6 320.5L461.9 313.5L461.5 304Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M485.8 311.7L483.5 317.2L483.5 314.4L485.8 308.8ZM483.5 317.2L478.7 323.4L478.7 320.6L483.5 314.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M478.7 323.4L471.5 323.3L471.5 320.5L478.7 320.6ZM471.5 323.3L463.6 320.5L463.6 317.6L471.5 320.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M463.6 320.5L461.9 313.5L461.9 310.7L463.6 317.6ZM461.9 313.5L461.5 304L461.5 301.2L461.9 310.7Z\"/><path class=\"iso-top\" d=\"M473.3 294L480.5 297.9L483.5 301.8L485.8 308.8L483.5 314.4L478.7 320.6L471.5 320.5L463.6 317.6L461.9 310.7L461.5 301.2L467.9 297.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M485.8 308.8L483.5 314.4L478.7 320.6L471.5 320.5L463.6 317.6L461.9 310.7L461.5 301.2\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M461.5 301.2L467.9 297.6L473.3 294L480.5 297.9L483.5 301.8L485.8 308.8M485.8 311.7L483.5 317.2L478.7 323.4L471.5 323.3L463.6 320.5L461.9 313.5L461.5 304M485.8 308.8L485.8 311.7M461.5 301.2L461.5 304\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M476.2 295.6L474.4 320.5M484.7 305.3L461.7 306.9M484.2 312.7L463.4 300.1\"/>","m6L":"<g class=\"iso-solid\" data-lit=\"\"><path class=\"iso-fill\" d=\"M461.5 301.2L473.3 294L480.5 297.9L483.5 301.8L485.8 308.8L485.8 311.7L483.5 317.2L478.7 323.4L471.5 323.3L463.6 320.5L461.9 313.5L461.5 304Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M485.8 311.7L483.5 317.2L483.5 314.4L485.8 308.8ZM483.5 317.2L478.7 323.4L478.7 320.6L483.5 314.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M478.7 323.4L471.5 323.3L471.5 320.5L478.7 320.6ZM471.5 323.3L463.6 320.5L463.6 317.6L471.5 320.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M463.6 320.5L461.9 313.5L461.9 310.7L463.6 317.6ZM461.9 313.5L461.5 304L461.5 301.2L461.9 310.7Z\"/><path class=\"iso-top\" d=\"M473.3 294L480.5 297.9L483.5 301.8L485.8 308.8L483.5 314.4L478.7 320.6L471.5 320.5L463.6 317.6L461.9 310.7L461.5 301.2L467.9 297.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M485.8 308.8L483.5 314.4L478.7 320.6L471.5 320.5L463.6 317.6L461.9 310.7L461.5 301.2\"/><path class=\"iso-line iso-edge\" data-tone=\"lit\" d=\"M461.5 301.2L467.9 297.6L473.3 294L480.5 297.9L483.5 301.8L485.8 308.8M485.8 311.7L483.5 317.2L478.7 323.4L471.5 323.3L463.6 320.5L461.9 313.5L461.5 304M485.8 308.8L485.8 311.7M461.5 301.2L461.5 304\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M476.2 295.6L474.4 320.5M484.7 305.3L461.7 306.9M484.2 312.7L463.4 300.1\"/>","m7":"<g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M457.4 310L461.9 303.8L469.6 296.3L484.6 296.7L486.9 303.3L486.9 306.1L486 310.5L481.8 317L475.4 320.1L466.5 322.5L461 318.9L457.4 312.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M486.9 306.1L486 310.5L486 307.7L486.9 303.3ZM486 310.5L481.8 317L481.8 314.2L486 307.7ZM481.8 317L475.4 320.1L475.4 317.3L481.8 314.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M475.4 320.1L466.5 322.5L466.5 319.7L475.4 317.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M466.5 322.5L461 318.9L461 316L466.5 319.7ZM461 318.9L457.4 312.9L457.4 310L461 316Z\"/><path class=\"iso-top\" d=\"M484.6 296.7L486.9 303.3L486 307.7L481.8 314.2L475.4 317.3L466.5 319.7L461 316L457.4 310L461.9 303.8L469.6 296.3L477.5 296.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M486.9 303.3L486 307.7L481.8 314.2L475.4 317.3L466.5 319.7L461 316L457.4 310\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M457.4 310L461.9 303.8L469.6 296.3L477.5 296.8L484.6 296.7L486.9 303.3M486.9 306.1L486 310.5L481.8 317L475.4 320.1L466.5 322.5L461 318.9L457.4 312.9M486.9 303.3L486.9 306.1M457.4 310L457.4 312.9\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M485.6 299.3L463.2 317.5M483.9 310.9L465 300.8M477.3 316.4L472 296.5\"/>","m7L":"<g class=\"iso-solid\" data-lit=\"\"><path class=\"iso-fill\" d=\"M457.4 310L461.9 303.8L469.6 296.3L484.6 296.7L486.9 303.3L486.9 306.1L486 310.5L481.8 317L475.4 320.1L466.5 322.5L461 318.9L457.4 312.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M486.9 306.1L486 310.5L486 307.7L486.9 303.3ZM486 310.5L481.8 317L481.8 314.2L486 307.7ZM481.8 317L475.4 320.1L475.4 317.3L481.8 314.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M475.4 320.1L466.5 322.5L466.5 319.7L475.4 317.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M466.5 322.5L461 318.9L461 316L466.5 319.7ZM461 318.9L457.4 312.9L457.4 310L461 316Z\"/><path class=\"iso-top\" d=\"M484.6 296.7L486.9 303.3L486 307.7L481.8 314.2L475.4 317.3L466.5 319.7L461 316L457.4 310L461.9 303.8L469.6 296.3L477.5 296.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M486.9 303.3L486 307.7L481.8 314.2L475.4 317.3L466.5 319.7L461 316L457.4 310\"/><path class=\"iso-line iso-edge\" data-tone=\"lit\" d=\"M457.4 310L461.9 303.8L469.6 296.3L477.5 296.8L484.6 296.7L486.9 303.3M486.9 306.1L486 310.5L481.8 317L475.4 320.1L466.5 322.5L461 318.9L457.4 312.9M486.9 303.3L486.9 306.1M457.4 310L457.4 312.9\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M485.6 299.3L463.2 317.5M483.9 310.9L465 300.8M477.3 316.4L472 296.5\"/>","m8":"<g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M456.8 307.5L459.1 301.1L467.8 298.6L479.9 296.7L491.1 304.4L491.1 307.2L487.3 313.4L482.9 316.3L474.2 319.2L466.7 318.4L457.9 315.9L456.8 310.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M491.1 307.2L487.3 313.4L487.3 310.5L491.1 304.4ZM487.3 313.4L482.9 316.3L482.9 313.4L487.3 310.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M482.9 316.3L474.2 319.2L474.2 316.4L482.9 313.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M474.2 319.2L466.7 318.4L466.7 315.5L474.2 316.4ZM466.7 318.4L457.9 315.9L457.9 313L466.7 315.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M457.9 315.9L456.8 310.3L456.8 307.5L457.9 313Z\"/><path class=\"iso-top\" d=\"M491.1 304.4L487.3 310.5L482.9 313.4L474.2 316.4L466.7 315.5L457.9 313L456.8 307.5L459.1 301.1L467.8 298.6L479.9 296.7L485.6 300.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M491.1 304.4L487.3 310.5L482.9 313.4L474.2 316.4L466.7 315.5L457.9 313L456.8 307.5\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M456.8 307.5L459.1 301.1L467.8 298.6L479.9 296.7L485.6 300.9L491.1 304.4M491.1 307.2L487.3 313.4L482.9 316.3L474.2 319.2L466.7 318.4L457.9 315.9L456.8 310.3M491.1 304.4L491.1 307.2M456.8 307.5L456.8 310.3\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M489.6 306.8L457.2 309.7M478.5 314.9L472.6 297.8M468.9 315.8L481.6 298\"/>","m8L":"<g class=\"iso-solid\" data-lit=\"\"><path class=\"iso-fill\" d=\"M456.8 307.5L459.1 301.1L467.8 298.6L479.9 296.7L491.1 304.4L491.1 307.2L487.3 313.4L482.9 316.3L474.2 319.2L466.7 318.4L457.9 315.9L456.8 310.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M491.1 307.2L487.3 313.4L487.3 310.5L491.1 304.4ZM487.3 313.4L482.9 316.3L482.9 313.4L487.3 310.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M482.9 316.3L474.2 319.2L474.2 316.4L482.9 313.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M474.2 319.2L466.7 318.4L466.7 315.5L474.2 316.4ZM466.7 318.4L457.9 315.9L457.9 313L466.7 315.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M457.9 315.9L456.8 310.3L456.8 307.5L457.9 313Z\"/><path class=\"iso-top\" d=\"M491.1 304.4L487.3 310.5L482.9 313.4L474.2 316.4L466.7 315.5L457.9 313L456.8 307.5L459.1 301.1L467.8 298.6L479.9 296.7L485.6 300.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M491.1 304.4L487.3 310.5L482.9 313.4L474.2 316.4L466.7 315.5L457.9 313L456.8 307.5\"/><path class=\"iso-line iso-edge\" data-tone=\"lit\" d=\"M456.8 307.5L459.1 301.1L467.8 298.6L479.9 296.7L485.6 300.9L491.1 304.4M491.1 307.2L487.3 313.4L482.9 316.3L474.2 319.2L466.7 318.4L457.9 315.9L456.8 310.3M491.1 304.4L491.1 307.2M456.8 307.5L456.8 310.3\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M489.6 306.8L457.2 309.7M478.5 314.9L472.6 297.8M468.9 315.8L481.6 298\"/>","cL":"<g class=\"iso-solid\" data-lit=\"\"><path class=\"iso-fill\" d=\"M451.3 311.4L451.4 310.8L462.1 294L462.7 293.5L463.5 293.3L464.3 293.4L496.1 305.3L496.8 305.8L497.1 306.4L497.1 307.6L496.9 308.3L486.2 325L485.7 325.5L484.8 325.7L484 325.6L452.2 313.7L451.5 313.3L451.3 312.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M497.1 307.6L496.9 308.3L496.9 307L497.1 306.4ZM496.9 308.3L486.2 325L486.2 323.8L496.9 307ZM486.2 325L485.7 325.5L485.7 324.3L486.2 323.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M485.7 325.5L484.8 325.7L484.8 324.5L485.7 324.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M484.8 325.7L484 325.6L484 324.4L484.8 324.5ZM484 325.6L452.2 313.7L452.2 312.5L484 324.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M452.2 313.7L451.5 313.3L451.5 312.1L452.2 312.5ZM451.5 313.3L451.3 312.7L451.3 311.4L451.5 312.1Z\"/><path class=\"iso-top\" d=\"M496.1 305.3L496.8 305.8L497.1 306.4L496.9 307L486.2 323.8L485.7 324.3L484.8 324.5L484 324.4L452.2 312.5L451.5 312.1L451.3 311.4L451.4 310.8L462.1 294L462.7 293.5L463.5 293.3L464.3 293.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M497.1 306.4L496.9 307L486.2 323.8L485.7 324.3L484.8 324.5L484 324.4L452.2 312.5L451.5 312.1L451.3 311.4\"/><path class=\"iso-line iso-bevel\" data-tone=\"lo\" d=\"M497.1 306.4L496.4 306.9L485.8 323.5L485.4 323.9L484.8 324.1L484.2 324L452.5 312.1L452 311.8L451.3 311.4\"/><path class=\"iso-line iso-edge\" data-tone=\"lit\" d=\"M451.3 311.4L451.4 310.8L462.1 294L462.7 293.5L463.5 293.3L464.3 293.4L496.1 305.3L496.8 305.8L497.1 306.4M497.1 307.6L496.9 308.3L486.2 325L485.7 325.5L484.8 325.7L484 325.6L452.2 313.7L451.5 313.3L451.3 312.7M497.1 306.4L497.1 307.6M451.3 311.4L451.3 312.7\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M486.4 317.5L487.1 318.1L487 318.9L484.8 322.3L484.1 322.9L483 322.8L454.4 312.1L453.7 311.5L453.8 310.7L456 307.3L456.8 306.8L457.8 306.8Z\"/><path class=\"iso-line\" data-tone=\"mid\" data-free=\"\" d=\"M464.7 297.1L482.1 303.6M462.9 300L486.5 308.8M461.1 302.8L473.5 307.5\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M462.3 311.8L461.8 312.3L461.1 312.6L460.3 312.7L459.6 312.5L458.9 312.1L458.5 311.6L458.4 311L458.6 310.4L459.1 309.9L459.8 309.6L460.6 309.5L461.4 309.7L462 310L462.4 310.6L462.5 311.2Z\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M472.3 315.5L471.8 316L471.1 316.3L470.3 316.4L469.5 316.2L468.9 315.9L468.4 315.3L468.3 314.7L468.5 314.1L469 313.6L469.7 313.3L470.5 313.2L471.3 313.4L472 313.8L472.4 314.3L472.5 314.9Z\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M482.2 319.2L481.7 319.7L481 320L480.2 320.1L479.4 319.9L478.8 319.6L478.4 319L478.3 318.4L478.5 317.8L479 317.3L479.7 317L480.5 316.9L481.3 317.1L481.9 317.5L482.3 318L482.4 318.6Z\"/>","c0":"<g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M451.3 311.4L451.4 310.8L462.1 294L462.7 293.5L463.5 293.3L464.3 293.4L496.1 305.3L496.8 305.8L497.1 306.4L497.1 307.6L496.9 308.3L486.2 325L485.7 325.5L484.8 325.7L484 325.6L452.2 313.7L451.5 313.3L451.3 312.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M497.1 307.6L496.9 308.3L496.9 307L497.1 306.4ZM496.9 308.3L486.2 325L486.2 323.8L496.9 307ZM486.2 325L485.7 325.5L485.7 324.3L486.2 323.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M485.7 325.5L484.8 325.7L484.8 324.5L485.7 324.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M484.8 325.7L484 325.6L484 324.4L484.8 324.5ZM484 325.6L452.2 313.7L452.2 312.5L484 324.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M452.2 313.7L451.5 313.3L451.5 312.1L452.2 312.5ZM451.5 313.3L451.3 312.7L451.3 311.4L451.5 312.1Z\"/><path class=\"iso-top\" d=\"M496.1 305.3L496.8 305.8L497.1 306.4L496.9 307L486.2 323.8L485.7 324.3L484.8 324.5L484 324.4L452.2 312.5L451.5 312.1L451.3 311.4L451.4 310.8L462.1 294L462.7 293.5L463.5 293.3L464.3 293.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M497.1 306.4L496.9 307L486.2 323.8L485.7 324.3L484.8 324.5L484 324.4L452.2 312.5L451.5 312.1L451.3 311.4\"/><path class=\"iso-line iso-bevel\" data-tone=\"lo\" d=\"M497.1 306.4L496.4 306.9L485.8 323.5L485.4 323.9L484.8 324.1L484.2 324L452.5 312.1L452 311.8L451.3 311.4\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M451.3 311.4L451.4 310.8L462.1 294L462.7 293.5L463.5 293.3L464.3 293.4L496.1 305.3L496.8 305.8L497.1 306.4M497.1 307.6L496.9 308.3L486.2 325L485.7 325.5L484.8 325.7L484 325.6L452.2 313.7L451.5 313.3L451.3 312.7M497.1 306.4L497.1 307.6M451.3 311.4L451.3 312.7\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M486.4 317.5L487.1 318.1L487 318.9L484.8 322.3L484.1 322.9L483 322.8L454.4 312.1L453.7 311.5L453.8 310.7L456 307.3L456.8 306.8L457.8 306.8Z\"/><path class=\"iso-line\" data-tone=\"lo\" data-free=\"\" d=\"M464.7 297.1L482.1 303.6M462.9 300L486.5 308.8M461.1 302.8L473.5 307.5\"/><path d=\"M462.3 311.8L461.8 312.3L461.1 312.6L460.3 312.7L459.6 312.5L458.9 312.1L458.5 311.6L458.4 311L458.6 310.4L459.1 309.9L459.8 309.6L460.6 309.5L461.4 309.7L462 310L462.4 310.6L462.5 311.2ZZ\" fill=\"var(--anatomy-shade-0)\" stroke=\"var(--anatomy-mid)\" stroke-width=\".5\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M472.3 315.5L471.8 316L471.1 316.3L470.3 316.4L469.5 316.2L468.9 315.9L468.4 315.3L468.3 314.7L468.5 314.1L469 313.6L469.7 313.3L470.5 313.2L471.3 313.4L472 313.8L472.4 314.3L472.5 314.9Z\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M482.2 319.2L481.7 319.7L481 320L480.2 320.1L479.4 319.9L478.8 319.6L478.4 319L478.3 318.4L478.5 317.8L479 317.3L479.7 317L480.5 316.9L481.3 317.1L481.9 317.5L482.3 318L482.4 318.6Z\"/>","c0L":"<g class=\"iso-solid\" data-lit=\"\"><path class=\"iso-fill\" d=\"M451.3 311.4L451.4 310.8L462.1 294L462.7 293.5L463.5 293.3L464.3 293.4L496.1 305.3L496.8 305.8L497.1 306.4L497.1 307.6L496.9 308.3L486.2 325L485.7 325.5L484.8 325.7L484 325.6L452.2 313.7L451.5 313.3L451.3 312.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M497.1 307.6L496.9 308.3L496.9 307L497.1 306.4ZM496.9 308.3L486.2 325L486.2 323.8L496.9 307ZM486.2 325L485.7 325.5L485.7 324.3L486.2 323.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M485.7 325.5L484.8 325.7L484.8 324.5L485.7 324.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M484.8 325.7L484 325.6L484 324.4L484.8 324.5ZM484 325.6L452.2 313.7L452.2 312.5L484 324.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M452.2 313.7L451.5 313.3L451.5 312.1L452.2 312.5ZM451.5 313.3L451.3 312.7L451.3 311.4L451.5 312.1Z\"/><path class=\"iso-top\" d=\"M496.1 305.3L496.8 305.8L497.1 306.4L496.9 307L486.2 323.8L485.7 324.3L484.8 324.5L484 324.4L452.2 312.5L451.5 312.1L451.3 311.4L451.4 310.8L462.1 294L462.7 293.5L463.5 293.3L464.3 293.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M497.1 306.4L496.9 307L486.2 323.8L485.7 324.3L484.8 324.5L484 324.4L452.2 312.5L451.5 312.1L451.3 311.4\"/><path class=\"iso-line iso-bevel\" data-tone=\"lo\" d=\"M497.1 306.4L496.4 306.9L485.8 323.5L485.4 323.9L484.8 324.1L484.2 324L452.5 312.1L452 311.8L451.3 311.4\"/><path class=\"iso-line iso-edge\" data-tone=\"lit\" d=\"M451.3 311.4L451.4 310.8L462.1 294L462.7 293.5L463.5 293.3L464.3 293.4L496.1 305.3L496.8 305.8L497.1 306.4M497.1 307.6L496.9 308.3L486.2 325L485.7 325.5L484.8 325.7L484 325.6L452.2 313.7L451.5 313.3L451.3 312.7M497.1 306.4L497.1 307.6M451.3 311.4L451.3 312.7\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M486.4 317.5L487.1 318.1L487 318.9L484.8 322.3L484.1 322.9L483 322.8L454.4 312.1L453.7 311.5L453.8 310.7L456 307.3L456.8 306.8L457.8 306.8Z\"/><path class=\"iso-line\" data-tone=\"mid\" data-free=\"\" d=\"M464.7 297.1L482.1 303.6M462.9 300L486.5 308.8M461.1 302.8L473.5 307.5\"/><path d=\"M462.3 311.8L461.8 312.3L461.1 312.6L460.3 312.7L459.6 312.5L458.9 312.1L458.5 311.6L458.4 311L458.6 310.4L459.1 309.9L459.8 309.6L460.6 309.5L461.4 309.7L462 310L462.4 310.6L462.5 311.2ZZ\" fill=\"var(--anatomy-shade-0)\" stroke=\"var(--anatomy-lo)\" stroke-width=\".5\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M472.3 315.5L471.8 316L471.1 316.3L470.3 316.4L469.5 316.2L468.9 315.9L468.4 315.3L468.3 314.7L468.5 314.1L469 313.6L469.7 313.3L470.5 313.2L471.3 313.4L472 313.8L472.4 314.3L472.5 314.9Z\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M482.2 319.2L481.7 319.7L481 320L480.2 320.1L479.4 319.9L478.8 319.6L478.4 319L478.3 318.4L478.5 317.8L479 317.3L479.7 317L480.5 316.9L481.3 317.1L481.9 317.5L482.3 318L482.4 318.6Z\"/>","c1":"<g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M451.3 311.4L451.4 310.8L462.1 294L462.7 293.5L463.5 293.3L464.3 293.4L496.1 305.3L496.8 305.8L497.1 306.4L497.1 307.6L496.9 308.3L486.2 325L485.7 325.5L484.8 325.7L484 325.6L452.2 313.7L451.5 313.3L451.3 312.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M497.1 307.6L496.9 308.3L496.9 307L497.1 306.4ZM496.9 308.3L486.2 325L486.2 323.8L496.9 307ZM486.2 325L485.7 325.5L485.7 324.3L486.2 323.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M485.7 325.5L484.8 325.7L484.8 324.5L485.7 324.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M484.8 325.7L484 325.6L484 324.4L484.8 324.5ZM484 325.6L452.2 313.7L452.2 312.5L484 324.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M452.2 313.7L451.5 313.3L451.5 312.1L452.2 312.5ZM451.5 313.3L451.3 312.7L451.3 311.4L451.5 312.1Z\"/><path class=\"iso-top\" d=\"M496.1 305.3L496.8 305.8L497.1 306.4L496.9 307L486.2 323.8L485.7 324.3L484.8 324.5L484 324.4L452.2 312.5L451.5 312.1L451.3 311.4L451.4 310.8L462.1 294L462.7 293.5L463.5 293.3L464.3 293.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M497.1 306.4L496.9 307L486.2 323.8L485.7 324.3L484.8 324.5L484 324.4L452.2 312.5L451.5 312.1L451.3 311.4\"/><path class=\"iso-line iso-bevel\" data-tone=\"lo\" d=\"M497.1 306.4L496.4 306.9L485.8 323.5L485.4 323.9L484.8 324.1L484.2 324L452.5 312.1L452 311.8L451.3 311.4\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M451.3 311.4L451.4 310.8L462.1 294L462.7 293.5L463.5 293.3L464.3 293.4L496.1 305.3L496.8 305.8L497.1 306.4M497.1 307.6L496.9 308.3L486.2 325L485.7 325.5L484.8 325.7L484 325.6L452.2 313.7L451.5 313.3L451.3 312.7M497.1 306.4L497.1 307.6M451.3 311.4L451.3 312.7\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M486.4 317.5L487.1 318.1L487 318.9L484.8 322.3L484.1 322.9L483 322.8L454.4 312.1L453.7 311.5L453.8 310.7L456 307.3L456.8 306.8L457.8 306.8Z\"/><path class=\"iso-line\" data-tone=\"lo\" data-free=\"\" d=\"M464.7 297.1L482.1 303.6M462.9 300L486.5 308.8M461.1 302.8L473.5 307.5\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M462.3 311.8L461.8 312.3L461.1 312.6L460.3 312.7L459.6 312.5L458.9 312.1L458.5 311.6L458.4 311L458.6 310.4L459.1 309.9L459.8 309.6L460.6 309.5L461.4 309.7L462 310L462.4 310.6L462.5 311.2Z\"/><path d=\"M472.3 315.5L471.8 316L471.1 316.3L470.3 316.4L469.5 316.2L468.9 315.9L468.4 315.3L468.3 314.7L468.5 314.1L469 313.6L469.7 313.3L470.5 313.2L471.3 313.4L472 313.8L472.4 314.3L472.5 314.9ZZ\" fill=\"var(--anatomy-shade-0)\" stroke=\"var(--anatomy-mid)\" stroke-width=\".5\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M482.2 319.2L481.7 319.7L481 320L480.2 320.1L479.4 319.9L478.8 319.6L478.4 319L478.3 318.4L478.5 317.8L479 317.3L479.7 317L480.5 316.9L481.3 317.1L481.9 317.5L482.3 318L482.4 318.6Z\"/>","c1L":"<g class=\"iso-solid\" data-lit=\"\"><path class=\"iso-fill\" d=\"M451.3 311.4L451.4 310.8L462.1 294L462.7 293.5L463.5 293.3L464.3 293.4L496.1 305.3L496.8 305.8L497.1 306.4L497.1 307.6L496.9 308.3L486.2 325L485.7 325.5L484.8 325.7L484 325.6L452.2 313.7L451.5 313.3L451.3 312.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M497.1 307.6L496.9 308.3L496.9 307L497.1 306.4ZM496.9 308.3L486.2 325L486.2 323.8L496.9 307ZM486.2 325L485.7 325.5L485.7 324.3L486.2 323.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M485.7 325.5L484.8 325.7L484.8 324.5L485.7 324.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M484.8 325.7L484 325.6L484 324.4L484.8 324.5ZM484 325.6L452.2 313.7L452.2 312.5L484 324.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M452.2 313.7L451.5 313.3L451.5 312.1L452.2 312.5ZM451.5 313.3L451.3 312.7L451.3 311.4L451.5 312.1Z\"/><path class=\"iso-top\" d=\"M496.1 305.3L496.8 305.8L497.1 306.4L496.9 307L486.2 323.8L485.7 324.3L484.8 324.5L484 324.4L452.2 312.5L451.5 312.1L451.3 311.4L451.4 310.8L462.1 294L462.7 293.5L463.5 293.3L464.3 293.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M497.1 306.4L496.9 307L486.2 323.8L485.7 324.3L484.8 324.5L484 324.4L452.2 312.5L451.5 312.1L451.3 311.4\"/><path class=\"iso-line iso-bevel\" data-tone=\"lo\" d=\"M497.1 306.4L496.4 306.9L485.8 323.5L485.4 323.9L484.8 324.1L484.2 324L452.5 312.1L452 311.8L451.3 311.4\"/><path class=\"iso-line iso-edge\" data-tone=\"lit\" d=\"M451.3 311.4L451.4 310.8L462.1 294L462.7 293.5L463.5 293.3L464.3 293.4L496.1 305.3L496.8 305.8L497.1 306.4M497.1 307.6L496.9 308.3L486.2 325L485.7 325.5L484.8 325.7L484 325.6L452.2 313.7L451.5 313.3L451.3 312.7M497.1 306.4L497.1 307.6M451.3 311.4L451.3 312.7\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M486.4 317.5L487.1 318.1L487 318.9L484.8 322.3L484.1 322.9L483 322.8L454.4 312.1L453.7 311.5L453.8 310.7L456 307.3L456.8 306.8L457.8 306.8Z\"/><path class=\"iso-line\" data-tone=\"mid\" data-free=\"\" d=\"M464.7 297.1L482.1 303.6M462.9 300L486.5 308.8M461.1 302.8L473.5 307.5\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M462.3 311.8L461.8 312.3L461.1 312.6L460.3 312.7L459.6 312.5L458.9 312.1L458.5 311.6L458.4 311L458.6 310.4L459.1 309.9L459.8 309.6L460.6 309.5L461.4 309.7L462 310L462.4 310.6L462.5 311.2Z\"/><path d=\"M472.3 315.5L471.8 316L471.1 316.3L470.3 316.4L469.5 316.2L468.9 315.9L468.4 315.3L468.3 314.7L468.5 314.1L469 313.6L469.7 313.3L470.5 313.2L471.3 313.4L472 313.8L472.4 314.3L472.5 314.9ZZ\" fill=\"var(--anatomy-shade-0)\" stroke=\"var(--anatomy-lo)\" stroke-width=\".5\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M482.2 319.2L481.7 319.7L481 320L480.2 320.1L479.4 319.9L478.8 319.6L478.4 319L478.3 318.4L478.5 317.8L479 317.3L479.7 317L480.5 316.9L481.3 317.1L481.9 317.5L482.3 318L482.4 318.6Z\"/>","c2":"<g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M451.3 311.4L451.4 310.8L462.1 294L462.7 293.5L463.5 293.3L464.3 293.4L496.1 305.3L496.8 305.8L497.1 306.4L497.1 307.6L496.9 308.3L486.2 325L485.7 325.5L484.8 325.7L484 325.6L452.2 313.7L451.5 313.3L451.3 312.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M497.1 307.6L496.9 308.3L496.9 307L497.1 306.4ZM496.9 308.3L486.2 325L486.2 323.8L496.9 307ZM486.2 325L485.7 325.5L485.7 324.3L486.2 323.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M485.7 325.5L484.8 325.7L484.8 324.5L485.7 324.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M484.8 325.7L484 325.6L484 324.4L484.8 324.5ZM484 325.6L452.2 313.7L452.2 312.5L484 324.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M452.2 313.7L451.5 313.3L451.5 312.1L452.2 312.5ZM451.5 313.3L451.3 312.7L451.3 311.4L451.5 312.1Z\"/><path class=\"iso-top\" d=\"M496.1 305.3L496.8 305.8L497.1 306.4L496.9 307L486.2 323.8L485.7 324.3L484.8 324.5L484 324.4L452.2 312.5L451.5 312.1L451.3 311.4L451.4 310.8L462.1 294L462.7 293.5L463.5 293.3L464.3 293.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M497.1 306.4L496.9 307L486.2 323.8L485.7 324.3L484.8 324.5L484 324.4L452.2 312.5L451.5 312.1L451.3 311.4\"/><path class=\"iso-line iso-bevel\" data-tone=\"lo\" d=\"M497.1 306.4L496.4 306.9L485.8 323.5L485.4 323.9L484.8 324.1L484.2 324L452.5 312.1L452 311.8L451.3 311.4\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M451.3 311.4L451.4 310.8L462.1 294L462.7 293.5L463.5 293.3L464.3 293.4L496.1 305.3L496.8 305.8L497.1 306.4M497.1 307.6L496.9 308.3L486.2 325L485.7 325.5L484.8 325.7L484 325.6L452.2 313.7L451.5 313.3L451.3 312.7M497.1 306.4L497.1 307.6M451.3 311.4L451.3 312.7\"/></g><path class=\"iso-line\" data-tone=\"faint\" d=\"M486.4 317.5L487.1 318.1L487 318.9L484.8 322.3L484.1 322.9L483 322.8L454.4 312.1L453.7 311.5L453.8 310.7L456 307.3L456.8 306.8L457.8 306.8Z\"/><path class=\"iso-line\" data-tone=\"lo\" data-free=\"\" d=\"M464.7 297.1L482.1 303.6M462.9 300L486.5 308.8M461.1 302.8L473.5 307.5\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M462.3 311.8L461.8 312.3L461.1 312.6L460.3 312.7L459.6 312.5L458.9 312.1L458.5 311.6L458.4 311L458.6 310.4L459.1 309.9L459.8 309.6L460.6 309.5L461.4 309.7L462 310L462.4 310.6L462.5 311.2Z\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M472.3 315.5L471.8 316L471.1 316.3L470.3 316.4L469.5 316.2L468.9 315.9L468.4 315.3L468.3 314.7L468.5 314.1L469 313.6L469.7 313.3L470.5 313.2L471.3 313.4L472 313.8L472.4 314.3L472.5 314.9Z\"/><path d=\"M482.2 319.2L481.7 319.7L481 320L480.2 320.1L479.4 319.9L478.8 319.6L478.4 319L478.3 318.4L478.5 317.8L479 317.3L479.7 317L480.5 316.9L481.3 317.1L481.9 317.5L482.3 318L482.4 318.6ZZ\" fill=\"var(--anatomy-shade-0)\" stroke=\"var(--anatomy-mid)\" stroke-width=\".5\"/>","c2L":"<g class=\"iso-solid\" data-lit=\"\"><path class=\"iso-fill\" d=\"M451.3 311.4L451.4 310.8L462.1 294L462.7 293.5L463.5 293.3L464.3 293.4L496.1 305.3L496.8 305.8L497.1 306.4L497.1 307.6L496.9 308.3L486.2 325L485.7 325.5L484.8 325.7L484 325.6L452.2 313.7L451.5 313.3L451.3 312.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M497.1 307.6L496.9 308.3L496.9 307L497.1 306.4ZM496.9 308.3L486.2 325L486.2 323.8L496.9 307ZM486.2 325L485.7 325.5L485.7 324.3L486.2 323.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M485.7 325.5L484.8 325.7L484.8 324.5L485.7 324.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M484.8 325.7L484 325.6L484 324.4L484.8 324.5ZM484 325.6L452.2 313.7L452.2 312.5L484 324.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M452.2 313.7L451.5 313.3L451.5 312.1L452.2 312.5ZM451.5 313.3L451.3 312.7L451.3 311.4L451.5 312.1Z\"/><path class=\"iso-top\" d=\"M496.1 305.3L496.8 305.8L497.1 306.4L496.9 307L486.2 323.8L485.7 324.3L484.8 324.5L484 324.4L452.2 312.5L451.5 312.1L451.3 311.4L451.4 310.8L462.1 294L462.7 293.5L463.5 293.3L464.3 293.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M497.1 306.4L496.9 307L486.2 323.8L485.7 324.3L484.8 324.5L484 324.4L452.2 312.5L451.5 312.1L451.3 311.4\"/><path class=\"iso-line iso-bevel\" data-tone=\"lo\" d=\"M497.1 306.4L496.4 306.9L485.8 323.5L485.4 323.9L484.8 324.1L484.2 324L452.5 312.1L452 311.8L451.3 311.4\"/><path class=\"iso-line iso-edge\" data-tone=\"lit\" d=\"M451.3 311.4L451.4 310.8L462.1 294L462.7 293.5L463.5 293.3L464.3 293.4L496.1 305.3L496.8 305.8L497.1 306.4M497.1 307.6L496.9 308.3L486.2 325L485.7 325.5L484.8 325.7L484 325.6L452.2 313.7L451.5 313.3L451.3 312.7M497.1 306.4L497.1 307.6M451.3 311.4L451.3 312.7\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M486.4 317.5L487.1 318.1L487 318.9L484.8 322.3L484.1 322.9L483 322.8L454.4 312.1L453.7 311.5L453.8 310.7L456 307.3L456.8 306.8L457.8 306.8Z\"/><path class=\"iso-line\" data-tone=\"mid\" data-free=\"\" d=\"M464.7 297.1L482.1 303.6M462.9 300L486.5 308.8M461.1 302.8L473.5 307.5\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M462.3 311.8L461.8 312.3L461.1 312.6L460.3 312.7L459.6 312.5L458.9 312.1L458.5 311.6L458.4 311L458.6 310.4L459.1 309.9L459.8 309.6L460.6 309.5L461.4 309.7L462 310L462.4 310.6L462.5 311.2Z\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M472.3 315.5L471.8 316L471.1 316.3L470.3 316.4L469.5 316.2L468.9 315.9L468.4 315.3L468.3 314.7L468.5 314.1L469 313.6L469.7 313.3L470.5 313.2L471.3 313.4L472 313.8L472.4 314.3L472.5 314.9Z\"/><path d=\"M482.2 319.2L481.7 319.7L481 320L480.2 320.1L479.4 319.9L478.8 319.6L478.4 319L478.3 318.4L478.5 317.8L479 317.3L479.7 317L480.5 316.9L481.3 317.1L481.9 317.5L482.3 318L482.4 318.6ZZ\" fill=\"var(--anatomy-shade-0)\" stroke=\"var(--anatomy-lo)\" stroke-width=\".5\"/>","r0":"<g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M449.9 310.6L449.9 310L461.1 292.5L461.7 292L462.6 292.1L497.9 305.3L498.4 305.8L498.4 307.7L498.4 308.4L487.2 325.9L486.6 326.3L485.7 326.3L450.5 313.1L449.9 312.6Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M498.4 307.7L498.4 308.4L498.4 306.4L498.4 305.8ZM498.4 308.4L487.2 325.9L487.2 323.9L498.4 306.4ZM487.2 325.9L486.6 326.3L486.6 324.3L487.2 323.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M486.6 326.3L485.7 326.3L485.7 324.3L486.6 324.3ZM485.7 326.3L450.5 313.1L450.5 311.1L485.7 324.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M450.5 313.1L449.9 312.6L449.9 310.6L450.5 311.1Z\"/><path class=\"iso-top\" d=\"M497.9 305.3L498.4 305.8L498.4 306.4L487.2 323.9L486.6 324.3L485.7 324.3L450.5 311.1L449.9 310.6L449.9 310L461.1 292.5L461.7 292L462.6 292.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M498.4 305.8L498.4 306.4L487.2 323.9L486.6 324.3L485.7 324.3L450.5 311.1L449.9 310.6\"/><path class=\"iso-line iso-bevel\" data-tone=\"lo\" d=\"M498.4 305.8L497.8 306.3L486.8 323.7L486.4 323.9L485.9 323.9L450.8 310.8L449.9 310.6\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M449.9 310.6L449.9 310L461.1 292.5L461.7 292L462.6 292.1L497.9 305.3L498.4 305.8M498.4 307.7L498.4 308.4L487.2 325.9L486.6 326.3L485.7 326.3L450.5 313.1L449.9 312.6M498.4 305.8L498.4 307.7M449.9 310.6L449.9 312.6\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M461.6 291.7L472.9 310.1L498.9 305.6\"/><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M469.9 309.4L470.2 308.5L470.9 307.8L472 307.4L473.1 307.2L474.3 307.5L475.2 308L475.8 308.8L476 309.7L476 310.2L475.7 311.1L475 311.8L473.9 312.3L472.8 312.4L471.6 312.2L470.7 311.6L470.1 310.9L469.9 310Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M475.7 311.1L475 311.8L475 311.3L475.7 310.6ZM475 311.8L473.9 312.3L473.9 311.8L475 311.3ZM476 310.2L475.7 311.1L475.7 310.6L476 309.7Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M473.9 312.3L472.8 312.4L472.8 311.9L473.9 311.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M472.8 312.4L471.6 312.2L471.6 311.7L472.8 311.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M471.6 312.2L470.7 311.6L470.7 311.1L471.6 311.7ZM470.7 311.6L470.1 310.9L470.1 310.3L470.7 311.1ZM470.1 310.9L469.9 310L469.9 309.4L470.1 310.3Z\"/><path class=\"iso-top\" d=\"M475.7 310.6L475 311.3L473.9 311.8L472.8 311.9L471.6 311.7L470.7 311.1L470.1 310.3L469.9 309.4L470.2 308.5L470.9 307.8L472 307.4L473.1 307.2L474.3 307.5L475.2 308L475.8 308.8L476 309.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M476 309.7L475.7 310.6L475 311.3L473.9 311.8L472.8 311.9L471.6 311.7L470.7 311.1L470.1 310.3L469.9 309.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M469.9 309.4L470.2 308.5L470.9 307.8L472 307.4L473.1 307.2L474.3 307.5L475.2 308L475.8 308.8L476 309.7M476 310.2L475.7 311.1L475 311.8L473.9 312.3L472.8 312.4L471.6 312.2L470.7 311.6L470.1 310.9L469.9 310M469.9 309.4L469.9 310M476 309.7L476 310.2\"/></g>","r1":"<g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M450.6 314.8L450.6 314.2L467.9 287.2L468.5 286.7L469.3 286.8L497.2 297.2L497.7 297.6L497.7 301.6L497.7 302.2L480.5 329.2L479.8 329.7L479 329.6L451.2 319.2L450.6 318.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M497.7 301.6L497.7 302.2L497.7 298.3L497.7 297.6ZM497.7 302.2L480.5 329.2L480.5 325.3L497.7 298.3ZM480.5 329.2L479.8 329.7L479.8 325.8L480.5 325.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M479.8 329.7L479 329.6L479 325.7L479.8 325.8ZM479 329.6L451.2 319.2L451.2 315.3L479 325.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M451.2 319.2L450.6 318.7L450.6 314.8L451.2 315.3Z\"/><path class=\"iso-top\" d=\"M497.2 297.2L497.7 297.6L497.7 298.3L480.5 325.3L479.8 325.8L479 325.7L451.2 315.3L450.6 314.8L450.6 314.2L467.9 287.2L468.5 286.7L469.3 286.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M497.7 297.6L497.7 298.3L480.5 325.3L479.8 325.8L479 325.7L451.2 315.3L450.6 314.8\"/><path class=\"iso-line iso-bevel\" data-tone=\"lo\" d=\"M497.7 297.6L497.1 298.2L480 325.1L479.7 325.4L479.1 325.3L451.5 315L450.6 314.8\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M497.7 299.6L497.7 300.2L480.5 327.3L479.8 327.7L479 327.7L451.2 317.3L450.6 316.8\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M450.6 314.8L450.6 314.2L467.9 287.2L468.5 286.7L469.3 286.8L497.2 297.2L497.7 297.6M497.7 301.6L497.7 302.2L480.5 329.2L479.8 329.7L479 329.6L451.2 319.2L450.6 318.7M497.7 297.6L497.7 301.6M450.6 314.8L450.6 318.7\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M449.1 314.2L449.2 313.6L466.9 285.8L467.5 285.3L468.3 285.4L472.6 287L473.1 287.4L473.1 291.9L473.1 292.5L455.4 320.3L454.7 320.8L453.9 320.7L449.7 319.1L449.1 318.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M473.1 291.9L473.1 292.5L473.1 288.1L473.1 287.4ZM473.1 292.5L455.4 320.3L455.4 315.9L473.1 288.1ZM455.4 320.3L454.7 320.8L454.7 316.3L455.4 315.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M454.7 320.8L453.9 320.7L453.9 316.3L454.7 316.3ZM453.9 320.7L449.7 319.1L449.7 314.7L453.9 316.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M449.7 319.1L449.1 318.7L449.1 314.2L449.7 314.7Z\"/><path class=\"iso-top\" d=\"M472.6 287L473.1 287.4L473.1 288.1L455.4 315.9L454.7 316.3L453.9 316.3L449.7 314.7L449.1 314.2L449.2 313.6L466.9 285.8L467.5 285.3L468.3 285.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M473.1 287.4L473.1 288.1L455.4 315.9L454.7 316.3L453.9 316.3L449.7 314.7L449.1 314.2\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M473.1 287.4L472.7 288L455 315.7L454.6 316L454 316L449.9 314.4L449.1 314.2\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M449.1 314.2L449.2 313.6L466.9 285.8L467.5 285.3L468.3 285.4L472.6 287L473.1 287.4M473.1 291.9L473.1 292.5L455.4 320.3L454.7 320.8L453.9 320.7L449.7 319.1L449.1 318.7M473.1 287.4L473.1 291.9M449.1 314.2L449.1 318.7\"/></g><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"467.8\" cy=\"290.4\" r=\"0.45\"/><circle cx=\"464.1\" cy=\"296.1\" r=\"0.45\"/><circle cx=\"460.5\" cy=\"301.8\" r=\"0.45\"/><circle cx=\"456.9\" cy=\"307.5\" r=\"0.45\"/><circle cx=\"453.2\" cy=\"313.2\" r=\"0.45\"/></g>","r2":"<g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M458 302.9L458 302.2L467.9 286.6L468.6 286.2L469.4 286.2L489.8 293.8L490.4 294.3L490.4 305.9L490.3 306.5L480.4 322.1L479.7 322.6L478.9 322.5L458.5 314.9L458 314.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M490.4 305.9L490.3 306.5L490.3 295L490.4 294.3ZM490.3 306.5L480.4 322.1L480.4 310.6L490.3 295ZM480.4 322.1L479.7 322.6L479.7 311L480.4 310.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M479.7 322.6L478.9 322.5L478.9 311L479.7 311ZM478.9 322.5L458.5 314.9L458.5 303.4L478.9 311Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M458.5 314.9L458 314.4L458 302.9L458.5 303.4Z\"/><path class=\"iso-top\" d=\"M489.8 293.8L490.4 294.3L490.3 295L480.4 310.6L479.7 311L478.9 311L458.5 303.4L458 302.9L458 302.2L467.9 286.6L468.6 286.2L469.4 286.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M490.4 294.3L490.3 295L480.4 310.6L479.7 311L478.9 311L458.5 303.4L458 302.9\"/><path class=\"iso-line iso-bevel\" data-tone=\"lo\" d=\"M490.4 294.3L489.6 294.8L479.8 310.3L479.5 310.5L479.1 310.5L458.9 302.9L458 302.9\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M490.4 296.5L490.3 297.2L480.4 312.8L479.7 313.2L478.9 313.2L458.5 305.6L458 305.1\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M458 302.9L458 302.2L467.9 286.6L468.6 286.2L469.4 286.2L489.8 293.8L490.4 294.3M490.4 305.9L490.3 306.5L480.4 322.1L479.7 322.6L478.9 322.5L458.5 314.9L458 314.4M490.4 294.3L490.4 305.9M458 302.9L458 314.4\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M477.8 289.3L466.8 306.5M481.5 290.7L470.6 307.9\"/>"},TEXT={"en":{"label":"Isometric machine: unformed tasks from one inlet are pressed, squared and punched into coded cards, routed by a shuttle to three agent machines and sent on as envelopes, booklets and boxes along one belt."},"ua":{"label":"Ізометрична машина: неоформлені задачі з одного входу пресуються, вирівнюються й отримують код, човник розвозить картки трьом агентам, а результати — конверти, зошити й коробки — їдуть однією стрічкою."}},STILL_T=21.95,STILL_ARRIVALS=[-9,-6,-3,0.6,4.1,7.6,11.1,15,18.5];
// Live code for the task-dispatch figure. Inlined by build.mjs after the kit, model.mjs and
// pose.mjs, inside one IIFE: no globals leak, nothing is fetched or evaluated.
// A calm automatic loop: it never reacts to pointer, touch, focus or keys. It pauses offscreen
// and shows one still frame under prefers-reduced-motion.
const SVGNS = 'http://www.w3.org/2000/svg';
function mount(figure) {
  if (figure.dataset.mounted) return;
  figure.dataset.mounted = 'true';
  const q = (s) => figure.querySelector(s), stage = q('.iso-stage'), svg = q('svg');
  const parts = {}, slots = {};
  figure.querySelectorAll('[data-part]').forEach((el) => { parts[el.dataset.part] = el; });
  figure.querySelectorAll('[data-slot]').forEach((el) => { slots[el.dataset.slot] = { el, items: new Map() }; });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let arrivals = START.slice(), tasks = simulate(arrivals), t = 0, visible = false, wait = 1.4, last = 0, frame = 0;

  function language() {
    const d = document.documentElement, a = d.getAttribute('data-lang');
    if (a === 'en' || a === 'ua') return a;
    if (/^uk/i.test(d.lang || '')) return 'ua';
    return new URLSearchParams(location.search).get('lang') === 'ua' ? 'ua' : 'en';
  }
  // On the site the description comes from content.js (anatomy.js); standalone, from TEXT.
  function words() { if (!figure.closest('[data-anatomy-host]')) svg.setAttribute('aria-label', TEXT[language()].label); }

  function sync(name, list) {
    const s = slots[name];
    if (!s) return;
    const seen = new Set();
    list.forEach((it, i) => {
      const key = it.id + '|' + it.art;
      seen.add(key);
      let g = s.items.get(key);
      if (!g) {
        g = s.el.querySelector('[data-item="' + it.id + '"][data-art="' + it.art + '"]');
        if (!g) { g = document.createElementNS(SVGNS, 'g'); g.setAttribute('data-item', it.id); g.setAttribute('data-art', it.art); g.innerHTML = ART[it.art]; }
        s.items.set(key, g);
      }
      g.setAttribute('transform', translateAlong(P, it.at));
      if (it.opacity != null && it.opacity < 1) g.setAttribute('opacity', it.opacity.toFixed(3)); else g.removeAttribute('opacity');
      if (s.el.children[i] !== g) s.el.insertBefore(g, s.el.children[i] || null);
    });
    for (const [key, g] of s.items) if (!seen.has(key)) { g.remove(); s.items.delete(key); }
    for (const g of [...s.el.children]) if (!seen.has(g.getAttribute('data-item') + '|' + g.getAttribute('data-art'))) g.remove();
  }

  function draw() {
    const S = stateAt(tasks, t), Q = poseOf(S, P), Sl = slotsOf(S);
    for (const [name, v] of Object.entries(Q.move)) if (parts[name]) parts[name].setAttribute('transform', translateAlong(P, v));
    for (const [name, html] of Object.entries(Q.html)) if (parts[name]) parts[name].innerHTML = html;
    for (const [name, list] of Object.entries(Sl)) sync(name, list);
    figure.dataset.time = t.toFixed(2);
    figure.dataset.busy = S.busy.map(Number).join('');
  }
  function still() { t = STILL_T; arrivals = STILL_ARRIVALS.slice(); tasks = simulate(arrivals); draw(); }

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 0;
    last = now;
    frame = 0;
    if (!visible || reduced.matches) return;
    if (wait > 0) wait -= dt;
    else {
      t += dt;
      if (wantsArrival(tasks, t)) { arrivals.push(Math.round(t * 1000) / 1000); tasks = simulate(arrivals); }
    }
    draw();
    frame = requestAnimationFrame(tick);
  }
  function run() { if (!frame && visible && !reduced.matches) { last = 0; frame = requestAnimationFrame(tick); } }
  new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    figure.dataset.visible = String(visible);
    if (visible) run(); else { cancelAnimationFrame(frame); frame = 0; last = 0; }
  }, { rootMargin: '120px 0px' }).observe(stage);
  new MutationObserver(words).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang', 'lang'] });
  reduced.addEventListener('change', () => { if (reduced.matches) { cancelAnimationFrame(frame); frame = 0; still(); } else { wait = 1.4; run(); } });
  // Test hook only (a custom event, never user input): jump the tour to time `t`.
  figure.addEventListener('erp:seek', (e) => { t = e.detail.t; arrivals = tourUntil(t); tasks = simulate(arrivals); wait = 1e9; draw(); });
  if (reduced.matches) still(); else draw();
  words();
}
function find() { document.querySelectorAll('.iso-figure[data-figure="erp-orders"]').forEach(mount); }
find();
new MutationObserver((list) => { if (list.some((m) => m.addedNodes.length)) find(); }).observe(document.documentElement, { childList: true, subtree: true });

})();
