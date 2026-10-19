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

// Assembly workshop model: four devices assemble one software screen on one fixture.
// Pure and deterministic: the whole state is a function of time (the loop repeats every CYCLE s).

// World layout (x across, y toward the viewer, z up), shared with the build and the live script.
const W = {
  glass: 18.05,                                  // z of the screen glass
  header: { x: -56, y: -34, w: 112, d: 12 },
  slots: [-56, -18, 20].flatMap((x) => [-16, 10].map((y) => ({ x, y, w: 36, d: 22 })))
    .sort((a, b) => a.y - b.y || a.x - b.x),     // back row left→right, then the front row
  park: { a: -64, c: 62 },                       // where the two bridges rest (y)
  base: [112, -46],                              // SCARA shoulder (x, y), back right
  feeder: [140, 24],                             // tile stack (x, y), right of the fixture
  links: [88, 80],
  arm: { up: 40, tile: 1.4 },                    // cup lift above the target; tile thickness
  feed: 4, stack: 6,                             // feeder floor z, tiles per screen
  rest: [150, -30],                             // arm parks folded beside the feeder
};
const FRAMES = [W.header, ...W.slots];
// Text rows printed by the bar: [x0, x1, y] on the glass (header rows, then two per widget).
const ROWS = [
  [-52, -6, -30.5], [-52, -24, -26.5],
  ...W.slots.flatMap((s, i) => [[s.x + 4, s.x + 4 + [24, 20, 26, 18, 22, 25][i], s.y + 5], [s.x + 4, s.x + 4 + [14, 18, 12, 20, 16, 11][i], s.y + 9]]),
];

// Phase timing (seconds). The plotter travels and draws at steady, readable speeds, so each frame
// takes time in proportion to its outline.
const PLACE = 2.8, SWEEP = 2.8, TRAVEL = 170, INK = 140, LIFT = 0.12;
const perimeter = (r) => 2 * (r.w + r.d);
const LAYOUT = [];
{
  let t = 0.6, from = [0, W.park.a];
  for (const r of FRAMES) {
    const move = Math.max(0.3, Math.hypot(r.x - from[0], r.y - from[1]) / TRAVEL), draw = perimeter(r) / INK;
    LAYOUT.push({ t0: t, move, draw, t1: t + move + LIFT + draw + LIFT, from });
    t += move + LIFT + draw + LIFT; from = [r.x, r.y];
  }
}
const T = {
  idle: 0.6,
  a0: 0.6, a1: LAYOUT[LAYOUT.length - 1].t1,     // plotter draws the frames
  aBack: 0.9,                                   // plotter returns to the back
  place: PLACE, sweep: SWEEP,
};
T.b0 = T.a1 + 0.3;                              // arm starts while the plotter backs off
T.b1 = T.b0 + W.slots.length * PLACE;
T.c0 = T.b1 + 1.0; T.c1 = T.c0 + SWEEP; T.cBack = 1.2;
T.d0 = T.c1 + 0.3; T.d1 = T.d0 + 2.0; T.hold = 2.0;
T.clear0 = T.d1 + T.hold; T.clear1 = T.clear0 + 1.2;
const CYCLE = T.clear1 + 0.4;

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (v) => { const t = clamp(v); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const lerp2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const center = (r) => [r.x + r.w / 2, r.y + r.d / 2];

// Pen position along the outline of frame r at progress p (0..1), clockwise from the back-left corner.
function outlinePoint(r, p) {
  const L = [r.w, r.d, r.w, r.d], tot = 2 * (r.w + r.d);
  let s = clamp(p) * tot;
  const c = [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.d], [r.x, r.y + r.d], [r.x, r.y]];
  for (let i = 0; i < 4; i++) {
    if (s <= L[i] || i === 3) { const f = L[i] ? Math.min(1, s / L[i]) : 0; return { at: lerp2(c[i], c[i + 1], f), corners: c.slice(0, i + 1) }; }
    s -= L[i];
  }
}

// Two-link arm: joint angles reaching (x, y); the elbow always stays on the far (back) side.
function reach(x, y) {
  const [bx, by] = W.base, [l1, l2] = W.links;
  let dx = x - bx, dy = y - by, d = Math.hypot(dx, dy);
  const dmax = l1 + l2 - 0.5, dmin = Math.abs(l1 - l2) + 0.5;
  if (d > dmax) { dx *= dmax / d; dy *= dmax / d; d = dmax; }
  if (d < dmin) { dx *= dmin / d; dy *= dmin / d; d = dmin; }
  const c2 = clamp((d * d - l1 * l1 - l2 * l2) / (2 * l1 * l2), -1, 1), q2 = -Math.acos(c2);
  const q1 = Math.atan2(dy, dx) - Math.atan2(l2 * Math.sin(q2), l1 + l2 * Math.cos(q2));
  const elbow = [bx + l1 * Math.cos(q1), by + l1 * Math.sin(q1)];
  return { q1, q2, elbow, tip: [elbow[0] + l2 * Math.cos(q1 + q2), elbow[1] + l2 * Math.sin(q1 + q2)] };
}

function stateAt(time) {
  const t = ((time % CYCLE) + CYCLE) % CYCLE;
  const S = {
    t, phase: 'idle', framesDone: 0, current: null, pen: [0, W.park.a], penDown: 0,
    bridgeA: W.park.a, bridgeC: W.park.c, placed: 0, stack: W.stack, cup: W.rest, cupZ: W.glass + W.arm.up, held: false,
    printY: Infinity, printing: false, scanX: null, green: 0, fade: 1, refill: 1,
  };
  // Clear: the finished screen fades out; the feeder fills up again.
  if (t >= T.clear0) {
    S.phase = 'clear';
    S.framesDone = FRAMES.length; S.placed = W.slots.length; S.printY = -Infinity; S.green = 1 - ease((t - T.clear0) / 0.4);
    S.fade = 1 - ease((t - T.clear0) / (T.clear1 - T.clear0));
    S.stack = W.stack; S.refill = ease((t - T.clear0) / (T.clear1 - T.clear0));
    return S;
  }
  // 1. Plotter: the bridge follows the pen in y, the carriage in x; the pen lifts between frames.
  if (t >= T.a0 && t < T.a1) {
    S.phase = 'layout';
    let k = 0; while (k < LAYOUT.length - 1 && t >= LAYOUT[k].t1) k++;
    const L = LAYOUT[k], r = FRAMES[k], u = t - L.t0, down = L.move + LIFT, end = down + L.draw;
    S.framesDone = k;
    if (u < L.move) { S.pen = lerp2(L.from, [r.x, r.y], ease(u / L.move)); S.penDown = 0; }
    else if (u < down) { S.pen = [r.x, r.y]; S.penDown = ease((u - L.move) / LIFT); }
    else if (u < end) {
      const o = outlinePoint(r, (u - down) / L.draw);
      S.pen = o.at; S.penDown = 1; S.current = { frame: k, path: [...o.corners, o.at] };
    } else { S.pen = [r.x, r.y]; S.penDown = 1 - ease((u - end) / LIFT); S.framesDone = k + 1; }
  } else if (t >= T.a1) {
    S.framesDone = FRAMES.length;
    const u = ease((t - T.a1) / T.aBack), last = FRAMES[FRAMES.length - 1];
    S.pen = lerp2([last.x, last.y], [0, W.park.a], u);
  }
  S.bridgeA = S.pen[1];
  // 2. Arm: feeder → frame, one tile per frame, back row first.
  if (t >= T.b0 && t < T.b1) {
    S.phase = 'place';
    const i = Math.floor((t - T.b0) / T.place), u = (t - T.b0 - i * T.place) / T.place, slot = center(W.slots[i]);
    const prev = i ? center(W.slots[i - 1]) : W.rest, top = W.feed + (W.stack - i) * W.arm.tile;
    S.placed = i; S.stack = W.stack - i;
    const high = W.glass + W.arm.up, lift = (z0, v) => z0 + (high - z0) * (1 + Math.cos(2 * Math.PI * clamp(v))) / 2;   // down and back up, easing at both ends
    if (u < 0.27) { S.cup = lerp2(prev, W.feeder, ease(u / 0.27)); S.cupZ = high; }
    else if (u < 0.5) { S.cup = W.feeder; S.cupZ = lift(top, (u - 0.27) / 0.23); if (u >= 0.385) { S.held = true; S.stack = W.stack - i - 1; } }
    else if (u < 0.75) { S.cup = lerp2(W.feeder, slot, ease((u - 0.5) / 0.25)); S.cupZ = high; S.held = true; S.stack = W.stack - i - 1; }
    else { S.cup = slot; S.cupZ = lift(W.glass, (u - 0.75) / 0.25); S.stack = W.stack - i - 1; if (u < 0.875) S.held = true; else S.placed = i + 1; }
    if (S.held) S.cupZ = Math.max(S.cupZ, (u < 0.5 ? top : W.glass) + W.arm.tile);
  } else if (t >= T.b1) {
    S.placed = W.slots.length; S.stack = 0;
    S.cup = lerp2(center(W.slots[W.slots.length - 1]), W.rest, ease((t - T.b1) / 0.9));
  }
  // 3. Print bar: sweeps from the front to the back over the screen, printing as it passes.
  if (t >= T.c0 && t < T.c1) {
    S.phase = 'print';
    S.bridgeC = lerp(W.park.c, -50, ease((t - T.c0) / T.sweep));
    S.printY = S.bridgeC; S.printing = true;
  } else if (t >= T.c1) {
    S.printY = -Infinity;
    S.bridgeC = lerp(-50, W.park.c, ease((t - T.c1) / T.cBack));
  }
  // 4. Inspection: a light band crosses the screen, then the lamp turns green.
  if (t >= T.d0 && t < T.d1) { S.phase = 'inspect'; S.scanX = lerp(-62, 62, ease((t - T.d0) / (T.d1 - T.d0))); }
  if (t >= T.d1) { S.phase = 'done'; S.green = ease((t - T.d1) / 0.35); }
  return S;
}

// Reduced motion: the finished screen with the green lamp, every device at rest.
const STILL_T = T.d1 + 1.2;

// Moving and rebuilt parts of the assembly cell, shared by build.mjs and the live script.
// Only kit functions are used, so the file inlines into live.js with its imports stripped.



const TILE = { w: 33, d: 19 };
const Z = { link1: [58, 4.5], link2: [51, 4.5], shoulder: 50, glass: W.glass };

// A rounded bar between two floor points (convex hull of two circles), extruded from z by h.
function bar(a, b, r, z, h, P, tone) {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), ring = [];
  for (let i = 0; i <= 8; i++) { const f = ang + Math.PI / 2 + i * Math.PI / 8; ring.push([b[0] + Math.cos(f - Math.PI) * r, b[1] + Math.sin(f - Math.PI) * r]); }
  for (let i = 0; i <= 8; i++) { const f = ang + Math.PI / 2 + i * Math.PI / 8; ring.push([a[0] + Math.cos(f) * r, a[1] + Math.sin(f) * r]); }
  return solidSvg(extrude(ring, z, h, P), { tone, crease: 'faint' });
}
const tile = (x, y, z, P, lit) => solidSvg(slabOf({ x: x - TILE.w / 2, y: y - TILE.d / 2, w: TILE.w, d: TILE.d, r: 1 }, z, W.arm.tile, P, 2, 0.3), { tone: 'hi', crease: 'lo', lit });

// The pick-and-place arm at this state: held tile, cup, quill, links and joints, back to front.
function armSvg(S, P) {
  const r = reach(S.cup[0], S.cup[1]), [bx, by] = W.base, tip = r.tip, el = r.elbow;
  let s = '';
  if (S.held) s += tile(tip[0], tip[1], S.cupZ - W.arm.tile, P, false);
  s += solidSvg(cylinder(tip[0], tip[1], 4, S.cupZ, 2, P, 18), { tone: 'mid' });
  s += solidSvg(cylinder(tip[0], tip[1], 1.6, S.cupZ + 2, Z.link2[0] - S.cupZ - 2, P, 12), { tone: 'mid' });
  s += bar(el, tip, 3.6, Z.link2[0], Z.link2[1], P, 'mid');
  s += solidSvg(cylinder(tip[0], tip[1], 4, Z.link2[0] + Z.link2[1], 5, P, 20), { tone: 'mid' });
  s += solidSvg(cylinder(el[0], el[1], 4.6, Z.link2[0] + Z.link2[1], Z.link1[0] - Z.link2[0] - Z.link2[1], P, 22), { tone: 'mid' });
  s += bar([bx, by], el, 4.4, Z.link1[0], Z.link1[1], P, 'mid');
  s += solidSvg(cylinder(el[0], el[1], 3, Z.link1[0] + Z.link1[1], 1.6, P, 18), { tone: 'mid' });
  s += solidSvg(cylinder(bx, by, 6, Z.link1[0] + Z.link1[1], 3, P, 24), { tone: 'mid' });
  return s;
}

// The frame the plotter is drawing now: an open line from its first corner to the pen.
function penLineSvg(S, P) {
  if (!S.current || S.current.path.length < 2) return '';
  return lineSvg(onTop(S.current.path, Z.glass, P), { tone: 'mid', free: true });   // both ends open until the frame closes
}

// The inspection band crossing the glass.
function scanSvg(S, P) {
  if (S.scanX == null) return '';
  const x = S.scanX, y0 = -40, y1 = 40;
  const band = pathOf([[x - 5, y0], [x + 5, y0], [x + 5, y1], [x - 5, y1]].map(([a, b]) => iso([a, b, Z.glass + 0.05], P)), true);
  const edge = pathOf([iso([x + 5, y0, Z.glass + 0.05], P), iso([x + 5, y1, Z.glass + 0.05], P)]);
  return `<path d="${band}" fill="var(--anatomy-hi)" opacity=".12"/>` + lineSvg(edge, { tone: 'hi' });
}

// Rigid moves, visibility and rebuilt markup for one state.
function poseOf(S, P) {
  return {
    move: { 'bridge-a': [0, S.bridgeA, 0], carriage: [S.pen[0], 0, 0], pen: [0, 0, -1.4 * S.penDown], 'bridge-c': [0, S.bridgeC, 0] },
    html: { arm: armSvg(S, P), 'pen-line': penLineSvg(S, P), scan: scanSvg(S, P) },
    show: {
      ...Object.fromEntries(FRAMES.map((_, i) => ['frame-' + i, i < S.framesDone])),
      ...Object.fromEntries(W.slots.map((_, i) => ['tile-' + i, i < S.placed])),
      ...Object.fromEntries(ROWS.map((r, i) => ['row-' + i, S.printY < r[2] && (i < 2 || Math.floor((i - 2) / 2) < S.placed)])),
      ...Object.fromEntries(Array.from({ length: W.stack }, (_, i) => ['feed-' + i, i < S.stack])),
    },
    opacity: { product: S.fade, lamp: S.green, 'feed-tiles': S.phase === 'clear' ? S.refill : 1 },
  };
}

const P={"origin":[361.04825878922185,267.51830802879397],"scale":1.3157228533086012,"azimuth":55,"elevation":45},TEXT={"en":{"label":"Isometric assembly workshop: a plotter draws the layout, an arm places the blocks, a print bar adds the text and an inspection tower checks it — four agents build one software screen together."},"ua":{"label":"Ізометричний складальний цех: плотер креслить макет, маніпулятор ставить блоки, друкувальна балка наносить текст, а контрольна вежа перевіряє — четверо агентів разом збирають один екран програми."}};
// Live code for the assembly workshop. Inlined by build.mjs after the kit, model.mjs and pose.mjs,
// inside one IIFE: no globals leak, nothing is fetched or evaluated.
// A calm automatic loop: it never reacts to pointer, touch, focus or keys. It pauses offscreen
// and shows one still frame under prefers-reduced-motion.
function mount(figure) {
  if (figure.dataset.mounted) return;
  figure.dataset.mounted = 'true';
  const q = (s) => figure.querySelector(s), stage = q('.iso-stage'), svg = q('svg');
  const parts = {}, shown = {};
  figure.querySelectorAll('[data-part]').forEach((el) => { parts[el.dataset.part] = el; });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let t = 0, visible = false, wait = 1.0, last = 0, frame = 0;
  function language() {
    const d = document.documentElement, a = d.getAttribute('data-lang');
    if (a === 'en' || a === 'ua') return a;
    if (/^uk/i.test(d.lang || '')) return 'ua';
    return new URLSearchParams(location.search).get('lang') === 'ua' ? 'ua' : 'en';
  }
  // On the site the description comes from content.js (anatomy.js); standalone, from TEXT.
  function words() { if (!figure.closest('[data-anatomy-host]')) svg.setAttribute('aria-label', TEXT[language()].label); }
  function draw() {
    const S = stateAt(t), Q = poseOf(S, P);
    for (const [name, v] of Object.entries(Q.move)) if (parts[name]) parts[name].setAttribute('transform', translateAlong(P, v));
    if (parts['carriage-top']) parts['carriage-top'].setAttribute('transform', translateAlong(P, Q.move.carriage));
    for (const [name, html] of Object.entries(Q.html)) if (parts[name] && shown[name] !== html) { parts[name].innerHTML = html; shown[name] = html; }
    for (const [name, on] of Object.entries(Q.show)) if (parts[name]) { const v = on ? '' : 'none'; if (parts[name].style.display !== v) parts[name].style.display = v; }
    for (const [name, o] of Object.entries(Q.opacity)) if (parts[name]) parts[name].setAttribute('opacity', o.toFixed(3));
    figure.dataset.time = t.toFixed(2);
    figure.dataset.phase = S.phase;
  }
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 0;
    last = now;
    frame = 0;
    if (!visible || reduced.matches) return;
    if (wait > 0) wait -= dt; else t += dt;
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
  reduced.addEventListener('change', () => { if (reduced.matches) { cancelAnimationFrame(frame); frame = 0; t = STILL_T; draw(); } else { wait = 1.0; run(); } });
  // Test hook only (a custom event, never user input): jump to time `t` and hold there.
  figure.addEventListener('assembly:seek', (e) => { t = e.detail.t; wait = 1e9; draw(); });
  if (reduced.matches) t = STILL_T;
  draw();
  words();
}
function find() { document.querySelectorAll('.iso-figure[data-figure="it-assembly"]').forEach(mount); }
find();
new MutationObserver((list) => { if (list.some((m) => m.addedNodes.length)) find(); }).observe(document.documentElement, { childList: true, subtree: true });

})();
