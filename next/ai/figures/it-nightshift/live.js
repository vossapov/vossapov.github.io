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

// Night shift: a fixed demonstration stream, no client data and no inferred statistics.
// Pure and deterministic: build, live page and checks all read the same functions.
// Each number is how many laps that task needs before its test lamp turns green.
const STREAM = [1, 2, 1, 1, 1, 1, 2, 1];
// World geometry of the ring (units ≈ px): stadium, centres at x = ±C, centreline radius R.
const C = 64, R = 80, DECK = 14, CARD = { l: 28, w: 18, t: 1.2 };
const LEN = 4 * C + 2 * Math.PI * R;
const QTR = Math.PI * R / 2;
const TRAY = { x: -192, y: 0 }, APEX = -C - R, SPUR_END = 200, DROP_X = 219;
const STOP = { reproduce: QTR + (-46 + C), repair: QTR + (-15 + C), test: QTR + (40 + C) };
const SWITCH_S = QTR + 2 * C;
const GEAR = { a: { x: -46, r: 18, n: 18 }, b: { x: -15, r: 13, n: 13 }, c: { x: 11, r: 13, n: 13 }, y: 35 };
const ARM = { rest: -31, gear: GEAR.y, bin: 1, mag: -31 };
const SPARES = 10, FILL = { first: 0.4, every: 0.55, fall: 0.5 }, DROP_Z = 52;
const TIME = { load: 2.2, reproduce: 2.1, move1: 0.8, repair: 3.0, move2: 0.9, test: 2.1, back: 3.4, exit: 2.3, gap: 0.4, dawn: 0.8, clear: 2.4, day: 0.8 };
const ease = v => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
const clamp01 = v => Math.max(0, Math.min(1, v));
const mix = (a, b, u) => a + (b - a) * u;

// Point and heading on the ring by arc length s (any real s; wraps). s = 0 is the left apex,
// travel runs +y there, then +x along the front straight (y = +R).
function ringAt(s) {
 let u = ((s % LEN) + LEN) % LEN;
 if (u < QTR) { const a = Math.PI - u / R; return { x: -C + R * Math.cos(a), y: R * Math.sin(a), h: a - Math.PI / 2 }; }
 u -= QTR;
 if (u < 2 * C) return { x: -C + u, y: R, h: 0 };
 u -= 2 * C;
 if (u < Math.PI * R) { const a = Math.PI / 2 - u / R; return { x: C + R * Math.cos(a), y: R * Math.sin(a), h: a - Math.PI / 2 }; }
 u -= Math.PI * R;
 if (u < 2 * C) return { x: C - u, y: -R, h: Math.PI };
 u -= 2 * C;
 const a = 3 * Math.PI / 2 - u / R; return { x: -C + R * Math.cos(a), y: R * Math.sin(a), h: a - Math.PI / 2 };
}

// The schedule of one night. tasks: [{ laps, dropAt, next }] (next = carried to the next night).
function schedule(tasks) {
 const segs = [], work = tasks.filter(t => !t.next);
 const landed = work.map(t => t.dropAt + FILL.fall);
 const procStart = FILL.first + FILL.every * (STREAM.length - 1) + FILL.fall + 0.4;
 let t = procStart;
 work.forEach((task, i) => {
  t = Math.max(t, landed[i] + 0.3);
  const add = (phase, d, extra = {}) => { segs.push({ phase, task: i, start: t, end: t + d, d, ...extra }); t += d; };
  add('load', TIME.load);
  for (let lap = 0; lap < task.laps; lap++) {
   const last = lap === task.laps - 1;
   add('reproduce', TIME.reproduce, { lap });
   add('move', TIME.move1, { lap, from: STOP.reproduce, to: STOP.repair });
   add('repair', TIME.repair, { lap });
   add('move', TIME.move2, { lap, from: STOP.repair, to: STOP.test });
   add('test', TIME.test, { lap, green: last });
   if (last) add('exit', TIME.exit, { lap }); else add('back', TIME.back, { lap, from: STOP.test, to: STOP.reproduce + LEN });
  }
  add('gap', TIME.gap);
 });
 const procEnd = t;
 const dawn = procEnd + TIME.dawn, clearEnd = dawn + TIME.clear, end = clearEnd + TIME.day;
 // Gear angle bookkeeping: every spin segment starts where the last one stopped.
 let angle = 0;
 for (const s of segs) if (s.phase === 'reproduce' || s.phase === 'test') { s.angle0 = angle; angle += spinAngle(1, !s.green); s.angle1 = angle; }
 return { segs, procStart, procEnd, dawn, clearEnd, end, work };
}

// Driver-gear speed in one spin phase: spin-up, run, then a jam (sudden stop with a short
// judder) or, when the test passes, an even run that coasts down.
const OMEGA = 3.2, UP0 = 0.1, UP1 = 0.26, JAM = 0.6, COAST = 0.82;
function spinAngle(u, jam) {
 const d = jam ? TIME.reproduce : TIME.test;
 const ramp = (a, b, x) => { const v = clamp01((x - a) / (b - a)); return (b - a) * v * v / 2; };
 let s = ramp(UP0, UP1, u) + Math.max(0, Math.min(u, jam ? JAM : COAST) - UP1);
 if (!jam && u > COAST) { const v = clamp01((u - COAST) / (1 - COAST)); s += (1 - COAST) * (v - v * v / 2); }
 return OMEGA * d * s;
}
function judder(u) { if (u < JAM) return 0; const a = u - JAM, d = TIME.reproduce * a; return 0.07 * Math.exp(-d / 0.12) * Math.sin(d * 2 * Math.PI * 11); }

// Arm keyframes during a repair: [u, y, down (0 up … 1 down), carry].
const ARMKEYS = [[0, ARM.rest, 0, ''], [0.16, ARM.gear, 0, ''], [0.25, ARM.gear, 1, ''], [0.27, ARM.gear, 1, 'old'], [0.36, ARM.gear, 0, 'old'], [0.5, ARM.bin, 0, 'old'], [0.54, ARM.bin, 0.35, 'old'], [0.56, ARM.bin, 0.35, ''], [0.66, ARM.mag, 0, ''], [0.73, ARM.mag, 1, ''], [0.75, ARM.mag, 1, 'new'], [0.81, ARM.mag, 0, 'new'], [0.9, ARM.gear, 0, 'new'], [0.96, ARM.gear, 1, 'new'], [0.97, ARM.gear, 1, ''], [1, ARM.gear, 0.6, '']];
function armAt(u) {
 let i = 0; while (i < ARMKEYS.length - 2 && u > ARMKEYS[i + 1][0]) i++;
 const [u0, y0, z0, c0] = ARMKEYS[i], [u1, y1, z1] = ARMKEYS[i + 1], v = ease((u - u0) / (u1 - u0 || 1));
 return { y: mix(y0, y1, v), down: mix(z0, z1, v), carry: c0 };
}

const lampOf = (on, age, off) => on ? ease(age / 0.12) * (off === undefined ? 1 : 1 - ease(off)) : 0;

// Full state of the machine at time t of one night.
function stateAt(tasks, time) {
 const sc = schedule(tasks), { segs, work } = sc;
 const seg = segs.find(s => time >= s.start && time < s.end) || null;
 const u = seg ? (time - seg.start) / seg.d : 0;
 const done = (phase, i) => segs.filter(s => s.phase === phase && s.end <= time && (i === undefined || s.task === i)).length;
 const morning = time >= sc.procEnd;
 // Counts: landed cards not yet loaded; card on the loop; finished cards awaiting review.
 const loaded = segs.filter(s => s.phase === 'load' && s.start <= time).length;
 const landedAll = tasks.filter(t => t.dropAt + FILL.fall <= time).length;
 const exited = done('exit');
 const cleared = time >= sc.dawn + TIME.clear * 0.7;
 const review = cleared ? 0 : exited;
 const onLoop = seg && seg.phase !== 'gap' ? 1 : 0;
 const queue = Math.max(0, landedAll - loaded);
 const dropping = tasks.filter(t => time >= t.dropAt && time < t.dropAt + FILL.fall).map(t => ({ p: (time - t.dropAt) / FILL.fall, under: queue }));
 // The card on the loop.
 let card = null;
 if (seg && seg.phase !== 'gap') {
  const p = seg.phase;
  if (p === 'load') {
   const push = clamp01(u / 0.3), ride = ease((u - 0.3) / 0.7);
   if (u < 0.3) card = { x: mix(TRAY.x, APEX, ease(push)), y: 0, z: DECK, h: Math.PI / 2, on: 'push' };
   else { const r = ringAt(ride * STOP.reproduce); card = { ...r, z: DECK, on: 'ring' }; }
  } else if (p === 'move' || p === 'back') { const r = ringAt(mix(seg.from, seg.to, ease(u))); card = { ...r, z: DECK, on: 'ring' }; }
  else if (p === 'exit') {
   const sx = SWITCH_S - STOP.test, run = ease(clamp01(u / 0.86)) * (sx + DROP_X - C);
   if (run < sx) { const r = ringAt(STOP.test + run); card = { ...r, z: DECK, on: 'ring' }; }
   else { const x = C + run - sx, fall = clamp01((x - SPUR_END) / (DROP_X - SPUR_END)); card = { x, y: R, z: mix(DECK, 2 + CARD.t * exited, fall * fall), h: 0, on: x > SPUR_END ? 'drop' : 'spur' }; }
  } else { const r = ringAt(STOP[p]); card = { ...r, z: DECK, on: 'ring' }; }
 }
 // Gears: the driver angle; the idler and output follow from the tooth counts.
 const spun = segs.filter(s => s.angle1 !== undefined && s.start <= time);
 const lastSpin = spun[spun.length - 1];
 let gear = 0, jam = 0, spinning = false;
 if (lastSpin) {
  const su = clamp01((time - lastSpin.start) / lastSpin.d), jams = !lastSpin.green;
  gear = lastSpin.angle0 + spinAngle(su, jams) + (jams ? judder(su) : 0);
  spinning = su > UP0 && su < (jams ? JAM : 1) && time < lastSpin.end;
  jam = jams && su >= JAM && time < lastSpin.end + TIME.move1 ? 1 : 0;
 }
 // Lamps (0…1 each): red when a jam is reproduced or a test fails, green when it passes.
 let red = 0, green = 0;
 for (const s of segs) {
  if (s.phase !== 'reproduce' && s.phase !== 'test') continue;
  const on = s.start + s.d * (JAM + 0.02), next = segs[segs.indexOf(s) + 1];
  if (time < on || !next) continue;
  const holdEnd = s.green ? next.start + next.d * 0.75 : next.start, fade = (time - holdEnd) / 0.5;
  if (fade > 1) continue;
  const v = lampOf(true, time - on, clamp01(fade));
  if (s.green) green = Math.max(green, v); else red = Math.max(red, v);
 }
 // Arm and spare gears.
 let arm = { y: ARM.rest, down: 0, carry: '' }, swapped = false;
 const repairs = segs.filter(s => s.phase === 'repair');
 const rep = repairs.find(s => time >= s.start && time < s.end);
 if (rep) { arm = armAt((time - rep.start) / rep.d); }
 else {
  const prev = [...repairs].reverse().find(s => s.end <= time);
  if (prev && time < prev.end + 1.6) { const v = ease((time - prev.end) / 1.6); arm = { y: mix(ARM.gear, ARM.rest, v), down: mix(0.6, 0, Math.min(1, v * 3)), carry: '' }; }
 }
 const ru = rep ? (time - rep.start) / rep.d : 0;
 const idlerOut = rep && ru >= 0.26 && ru < 0.965;
 const taken = repairs.filter(s => time >= s.start + s.d * 0.74).length;
 const spares = morning && time >= sc.dawn + TIME.clear ? SPARES : Math.max(1, SPARES - taken);
 // Switch blade: 0 = loop, 1 = exit (thrown on a green result, back once the card is off).
 let blade = 0;
 const ex = segs.find(s => s.phase === 'exit' && time >= s.start - 0.4 && time < s.end + 0.6);
 if (ex) blade = ease((time - (ex.start - 0.4)) / 0.5) * (1 - ease((time - (ex.end + 0.1)) / 0.5));
 // Day/night dial: 0 … π is the night (the tasks), π … 2π the day (morning, then the next fill).
 let dial;
 if (time < sc.procStart) dial = mix(1.6 * Math.PI, 2 * Math.PI, time / sc.procStart);
 else if (time < sc.dawn) dial = Math.PI * (time - sc.procStart) / (sc.dawn - sc.procStart);
 else dial = mix(Math.PI, 1.6 * Math.PI, (time - sc.dawn) / (sc.end - sc.dawn));
 const lift = morning ? ease((time - sc.dawn) / (TIME.clear * 0.7)) : 0;
 const phase = seg ? seg.phase : time < sc.procStart ? 'fill' : morning ? (time >= sc.dawn ? 'clear' : 'dawn') : 'gap';
 const step = seg && ['reproduce', 'repair', 'test'].includes(seg.phase) ? seg.phase : seg && seg.phase === 'move' ? (seg.to === STOP.repair ? 'toRepair' : 'toTest') : phase;
 return { time, phase, step, u, task: seg ? seg.task : -1, lap: seg && seg.lap !== undefined ? seg.lap : -1, pass: !!(seg && seg.green), card, queue, onLoop, review, exited, dropping, gear, jam, spinning, red, green, arm, idlerOut, spares, blade, dial, lift, end: sc.end, procStart: sc.procStart, procEnd: sc.procEnd, dawn: sc.dawn, works: work.length };
}

// A night: the stream dropped one card at a time, plus any cards carried over.
function night(carried = 0, offset = 0) {
 const tasks = [];
 for (let i = 0; i < carried; i++) tasks.push({ laps: STREAM[(offset + i) % STREAM.length], dropAt: -1 });
 STREAM.forEach((laps, i) => tasks.push({ laps, dropAt: FILL.first + FILL.every * i }));
 return tasks;
}
const nightLength = tasks => schedule(tasks).end;
// The reduced-motion still: a shorter night of six tasks, the fourth at the test stop, green.
function still() {
 const tasks = night().slice(0, 6), sc = schedule(tasks);
 const test = sc.segs.find(s => s.phase === 'test' && s.task === 3);
 return { tasks, time: test.start + test.d * 0.9 };
}
const WORDS = {
 en: { queue: 'queued', loop: 'on the loop', review: 'awaiting review', fill: 'queue', load: 'onto the loop', reproduce: 'reproduce', toRepair: '→ repair', toTest: '→ test', repair: 'repair', test: 'test', back: 'another lap', exit: 'to review', gap: 'next task', dawn: 'morning', clear: 'morning', red: 'red', green: 'green' },
 ua: { queue: 'у черзі', loop: 'на колі', review: 'чекає рев’ю', fill: 'черга', load: 'на коло', reproduce: 'відтворення', toRepair: '→ ремонт', toTest: '→ тести', repair: 'ремонт', test: 'тести', back: 'ще одне коло', exit: 'на рев’ю', gap: 'наступна задача', dawn: 'ранок', clear: 'ранок', red: 'червоний', green: 'зелений' }
};
function readout(s, lang) {
 const w = WORDS[lang] || WORDS.en;
 return `${w.queue} ${s.queue} · ${w.loop} ${s.onLoop} · ${w.review} ${s.review} · ${w[s.step] || s.step}`;
}

// Drawing helpers shared by the build and the live page (inlined into live.js without the
// import/export lines). K is the kit namespace in the build and an object of kit globals live.


// One gear outline: n teeth on pitch radius r, turned by a (radians), lying flat.
function gearPoints(cx, cy, r, n, a) {
 const p = 2 * Math.PI / n, rt = r + 1.7, rr = r - 1.9, pts = [];
 for (let i = 0; i < n; i++) {
  const c = a + i * p;
  for (const [rad, off] of [[rr, -0.5], [rr, -0.3], [rt, -0.14], [rt, 0.14], [rr, 0.3]]) pts.push([cx + rad * Math.cos(c + off * p), cy + rad * Math.sin(c + off * p)]);
 }
 return pts;
}
// Meshing: the idler and output follow the driver; the phase puts a tooth in each gap.
function gearAngles(t) {
 const b = -t * GEAR.a.n / GEAR.b.n + Math.PI + Math.PI / GEAR.b.n;
 const c = -b * GEAR.b.n / GEAR.c.n + Math.PI + Math.PI / GEAR.c.n;
 return [t, b, c];
}
// A flat gear with a web of four lightening holes, a root line and one index dot, all turning.
function gearSvg(K, P, cx, cy, r, n, a, z, h, o = {}) {
 const top = z + h;
 let s = K.solidSvg(K.extrude(gearPoints(cx, cy, r, n, a), z, h, P, { convex: false }), { tone: o.tone || 'hi', crease: 'lo' });
 let lines = K.ring(cx, cy, r - 4.2, top, P, 40) + K.ring(cx, cy, r * 0.3, top, P, 20);
 for (let i = 0; i < 4; i++) { const q = a + Math.PI / 4 + i * Math.PI / 2, d = r * 0.6; lines += K.ring(cx + d * Math.cos(q), cy + d * Math.sin(q), r * 0.17, top, P, 16); }
 s += K.lineSvg(lines, { tone: 'lo' });
 if (!o.plain) s += K.dotsSvg([K.iso([cx + (r - 6.4) * Math.cos(a), cy + (r - 6.4) * Math.sin(a), top], P)], { size: 0.9, tone: 'hi' });
 return s;
}
// A task card: a chamfered blank, long side along the heading h; an inset rule on its top.
function cardPoints(cx, cy, h, inset = 0) {
 const L = CARD.l / 2 - inset, Wd = CARD.w / 2 - inset, cut = 5 - inset * 0.6;
 const c = Math.cos(h), s = Math.sin(h);
 return [[-L, -Wd], [L, -Wd], [L, Wd - cut], [L - cut, Wd], [-L, Wd]].map(([u, v]) => [cx + u * c - v * s, cy + u * s + v * c]);
}
function cardSvg(K, P, cx, cy, z, h, o = {}) {
 const lit = !!o.lit;
 const body = K.extrude(cardPoints(cx, cy, h), z, CARD.t, P);
 return (lit ? `<path class="iso-halo" d="${K.extrude(cardPoints(cx, cy, h, -1.5), z - 0.2, 0.1, P).fill}"/>` : '') + K.solidSvg(body, { tone: lit ? 'lit' : 'hi', lit, crease: 'lo' }) +
  K.lineSvg(K.onTop(cardPoints(cx, cy, h, 2.4), z + CARD.t, P, true), { tone: lit ? 'mid' : 'faint' });
}
// The switch tongue: an arc of the outer guide (r 96…99 round the right-cap centre, from the
// front straight's end at 90° down to 40°), pivoted at its upstream end and swung out by w.
const TONGUE = { cx: 64, cy: 0, r0: 96, r1: 99, a0: 90, a1: 40, pivot: [64, 97.5], swing: 27 };
function tonguePoints(w) {
 const T = TONGUE, pts = [], rot = w * T.swing * Math.PI / 180, [px, py] = T.pivot;
 const arc = (r, from, to) => { for (let i = 0; i <= 12; i++) { const a = (from + (to - from) * i / 12) * Math.PI / 180; pts.push([T.cx + r * Math.cos(a), T.cy + r * Math.sin(a)]); } };
 arc(T.r1, T.a0, T.a1); arc(T.r0, T.a1, T.a0);
 return pts.map(([x, y]) => { const dx = x - px, dy = y - py; return [px + dx * Math.cos(rot) - dy * Math.sin(rot), py + dx * Math.sin(rot) + dy * Math.cos(rot)]; });
}
function tongueSvg(K, P, w) {
 return K.solidSvg(K.extrude(tonguePoints(w), DECK, 4, P, { convex: false }), { tone: 'mid' });
}

const P={"origin":[374.97700999290487,189.36158508937126],"scale":1.026623670274722,"azimuth":68,"elevation":42},TEXT={"en":{"label":"Isometric night-shift bench: identical task cards ride a ring track past reproduction, repair and test stops until a green lamp sends them to a review tray in front of an accept lever the machine never pulls; a day/night dial turns in the corner."},"ua":{"label":"Ізометричний стіл «Нічна зміна»: однакові картки задач їдуть кільцем повз відтворення, ремонт і тести, поки зелена лампа не відправить їх до лотка рев’ю перед важелем «прийняти», якого машина не торкається; у куті обертається циферблат дня й ночі."}},ID="it-nightshift",GZ=26.5,GH=3,IZ=15.5,BZ=73.5,SPH=1.8,SP=10,AX=-15,MAG=[-15,-31],LX=40,LY=35,DC=[-176,105],DR=16,DT=12,QUEUE_MAX=12,REVIEW_MAX=12;
const k={extrude,solidSvg,lineSvg,dotsSvg,onTop,ring,iso,slabOf,cylinder,lineOnTop,translateAlong,depthOf},Q={gearSvg,cardSvg,tongueSvg,gearAngles},M={ARM,GEAR,CARD,SPARES,DECK},S=(p,o)=>solidSvg(p,o),D=(pts,o={})=>dotsSvg(pts,{size:.5,...o}),at=p=>iso(p,P);
const crankAt=a => { const c = [M.GEAR.a.x, M.GEAR.y], e = [c[0] + 12 * Math.cos(a), c[1] + 12 * Math.sin(a)], n = [-Math.sin(a) * 2, Math.cos(a) * 2]; const arm = [[c[0] + n[0], c[1] + n[1]], [e[0] + n[0], e[1] + n[1]], [e[0] - n[0], e[1] - n[1]], [c[0] - n[0], c[1] - n[1]]]; return S(k.extrude(arm, GZ + GH + 2.4, 1.6, P), { tone: 'mid' }) + S(k.cylinder(e[0], e[1], 2.4, GZ + GH + 4, 6, P, 20), { tone: 'mid' }); };
const handAt=a => k.lineOnTop([DC[0] - Math.sin(a) * 3, DC[1] + Math.cos(a) * 3], [DC[0] + Math.sin(a) * (DR - 4), DC[1] - Math.cos(a) * (DR - 4)], DT + 0.2, P);
function gripLow(y) { return y > 20 ? GZ + GH - 1 : y > -14 ? IZ + 18 : IZ + 2.5 + SP * SPH - 1; }
const armSvg=(y, down, carry) => {
 const zTop = BZ - 9, low = gripLow(y), zg = zTop - 6 - (zTop - 6 - low) * down;
 let s = '';
 if (carry) s += Q.gearSvg(k, P, AX, y, M.GEAR.b.r, M.GEAR.b.n, 0.2, zg - 3.4, SPH, { plain: true });
 s += S(k.slabOf({ x: AX - 7, y: y - 2, w: 14, d: 4, r: 0.8 }, zg - 4, 2.2, P, 2), { tone: 'mid' });
 s += S(k.slabOf({ x: AX - 6, y: y - 4.5, w: 12, d: 9, r: 1.5 }, zg - 1.8, 3.6, P, 3), { tone: 'mid' });
 s += S(k.cylinder(AX, y, 1.6, zg + 1.8, zTop - zg - 1.8, P, 16), { tone: 'hi', crease: 'none' });
 s += S(k.slabOf({ x: AX - 7, y: y - 8, w: 14, d: 16, r: 2 }, zTop, 9, P, 4, 0.5), { tone: 'mid' });
 s += D([at([AX - 3.5, y - 5, zTop + 9]), at([AX + 3.5, y + 5, zTop + 9])], { size: 0.45 });
 return s;
};
// Live code for the night-shift figure. Everything it draws comes from stateAt() in the model.
function mount(figure) {
 if (figure.dataset.mounted) return; figure.dataset.mounted = 'true';
 const q = s => figure.querySelector(s), part = n => q('[data-part="' + n + '"]');
 const stage = q('.iso-stage'), svg = q('svg'), layer = q('[data-layer="sort"]');
 const ref = Object.fromEntries(['card', 'falling', 'pusher', 'gear-a', 'gear-b', 'gear-c', 'crank', 'arm', 'tongue', 'review', 'hand'].map(n => [n, part(n)]));
 const queueCards = [...figure.querySelectorAll('[data-q]')], reviewCards = [...figure.querySelectorAll('[data-r]')], spareGears = [...figure.querySelectorAll('[data-s]')];
 const glow = { red: q('[data-glow="red"]'), green: q('[data-glow="green"]') };
 const statics = [...layer.children].filter(el => el !== ref.card);
 const keys = statics.map(el => +el.getAttribute('data-k'));
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 let tasks = night(), time = 0, carried = 0, served = 0, cache = {};
 let visible = false, resumeAt = Infinity, held = false, frame = 0, last = 0, dialShown = null;
 const now = () => performance.now() / 1000;
 function language() {
  const d = document.documentElement, a = d.getAttribute('data-lang');
  if (a === 'en' || a === 'ua') return a;
  const u = new URLSearchParams(location.search).get('lang');
  if (u === 'en' || u === 'ua') return u;
  return /^uk/i.test(d.lang || '') ? 'ua' : 'en';
 }
 // On the site the description comes from content.js (anatomy.js); standalone, from TEXT.
 function words() { if (!figure.closest('[data-anatomy-host]')) svg.setAttribute('aria-label', TEXT[language()].label); draw(); }
 // Slot a moving group among the static items by its depth key.
 function slot(el, k0) {
  let lo = 0, hi = keys.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (keys[m] <= k0) lo = m + 1; else hi = m; }
  const before = statics[lo] || null;
  if (el.nextSibling !== before || el.parentNode !== layer) layer.insertBefore(el, before);
 }
 const set = (name, html) => { if (cache[name] !== html) { cache[name] = html; ref[name].innerHTML = html; } };
 const show = (el, on) => { const v = on ? '' : 'none'; if (el.style.display !== v) el.style.display = v; };
 function state() { if (reduced.matches) { const st = still(); return stateAt(tasks === null ? st.tasks : tasks, st.time); } return stateAt(tasks, time); }
 function draw() {
  const s = state();
  figure.dataset.phase = s.phase; figure.dataset.time = s.time.toFixed(2); figure.dataset.queue = s.queue; figure.dataset.review = s.review; figure.dataset.lamp = s.green > 0.5 ? 'green' : s.red > 0.5 ? 'red' : 'off'; figure.dataset.lever = 'untouched'; figure.dataset.tasks = reduced.matches && tasks === null ? 6 : tasks.length;
  // Card on the loop.
  if (s.card) {
   const c = s.card;
   set('card', Q.cardSvg(k, P, +c.x.toFixed(2), +c.y.toFixed(2), +c.z.toFixed(2), +c.h.toFixed(4), { lit: true }));
   slot(ref.card, depthOf([c.x, c.y, c.z + 0.6], P)); show(ref.card, true);
  } else show(ref.card, false);
  // Cards dropping into the magazine, and the queue in it.
  const f = s.dropping[0];
  if (f) { const z = DROP_Z + (DECK + CARD.t * f.under - DROP_Z) * f.p * f.p; ref.falling.setAttribute('transform', translateAlong(P, [0, 0, z])); show(ref.falling, true); } else show(ref.falling, false);
  queueCards.forEach((el, i) => show(el, i < Math.min(s.queue, QUEUE_MAX)));
  const push = s.phase === 'load' ? (s.u < 0.3 ? Math.min(18, s.card.x - TRAY.x) : 18 * (1 - ease((s.u - 0.3) / 0.25))) : 0;
  ref.pusher.setAttribute('transform', translateAlong(P, [Math.max(0, push), 0, 0]));
  // Gear train, crank and the idler that the arm swaps.
  const [a, b, c] = gearAngles(s.gear);
  set('gear-a', Q.gearSvg(k, P, GEAR.a.x, GEAR.y, GEAR.a.r, GEAR.a.n, +a.toFixed(4), GZ, GH));
  set('gear-b', Q.gearSvg(k, P, GEAR.b.x, GEAR.y, GEAR.b.r, GEAR.b.n, +b.toFixed(4), GZ, GH));
  set('gear-c', Q.gearSvg(k, P, GEAR.c.x, GEAR.y, GEAR.c.r, GEAR.c.n, +c.toFixed(4), GZ, GH));
  set('crank', crankAt(+a.toFixed(4)));
  show(ref['gear-b'], !s.idlerOut);
  set('arm', armSvg(+s.arm.y.toFixed(2), +s.arm.down.toFixed(3), s.arm.carry));
  spareGears.forEach((el, i) => show(el, i < s.spares));
  set('tongue', Q.tongueSvg(k, P, +s.blade.toFixed(3)));
  glow.red.setAttribute('opacity', s.red.toFixed(3)); glow.green.setAttribute('opacity', s.green.toFixed(3));
  // Review stack; in the morning it is lifted away.
  reviewCards.forEach((el, i) => show(el, i < Math.min(s.review, REVIEW_MAX)));
  if (s.lift > 0 && s.review) { ref.review.setAttribute('transform', translateAlong(P, [0, 0, 70 * s.lift])); ref.review.style.opacity = String(1 - s.lift); }
  else if (ref.review.hasAttribute('transform')) { ref.review.removeAttribute('transform'); ref.review.style.opacity = ''; }
  // Day/night hand: never steps back when a task is added mid-night.
  if (dialShown === null || s.dial >= dialShown || dialShown - s.dial > Math.PI || reduced.matches) dialShown = s.dial;
  ref.hand.setAttribute('d', handAt(dialShown - Math.PI / 2));
 }
 // A calm automatic loop: it never reacts to pointer, touch, focus or keys.
 function running(t) { if (held || reduced.matches || !visible) return false; return t >= resumeAt; }
 function tick(ms) {
  const dt = last ? Math.min((ms - last) / 1000, 1 / 30) : 0; last = ms;
  if (!visible || reduced.matches) { frame = 0; return; }
  if (running(now())) {
   time += dt;
   const end = nightLength(tasks);
   if (time >= end) { served += tasks.filter(t => !t.next).length; tasks = night(carried, served); carried = 0; time = 0; }
   draw();
  }
  frame = requestAnimationFrame(tick);
 }
 function run() { if (!frame && visible && !reduced.matches) { last = 0; frame = requestAnimationFrame(tick); } }
 new IntersectionObserver(entries => {
  visible = entries[entries.length - 1].isIntersecting; figure.dataset.visible = String(visible);
  if (visible) { if (resumeAt === Infinity) resumeAt = now() + 1.4; run(); } else { cancelAnimationFrame(frame); frame = 0; last = 0; }
 }, { rootMargin: '120px 0px' }).observe(stage);
 new MutationObserver(words).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang', 'lang'] });
 reduced.addEventListener('change', () => { if (reduced.matches) { tasks = null; cancelAnimationFrame(frame); frame = 0; } else { tasks = night(); time = 0; resumeAt = now() + 1.4; run(); } draw(); });
 if (reduced.matches) tasks = null;
 // Test hook only (a custom event, never user input): seek the model to a time of the demo night.
 figure.addEventListener('nightshift:seek', e => { const d = e.detail || {}; tasks = night(); carried = 0; served = 0; time = Math.max(0, d.time || 0); held = d.hold !== false; dialShown = null; draw(); run(); });
 words();
}
function find() { const list = document.querySelectorAll('.iso-figure[data-figure="' + ID + '"]'); list.forEach(mount); return list.length; }
if (!find()) { const watch = new MutationObserver(() => { if (find()) watch.disconnect(); }); watch.observe(document.documentElement, { childList: true, subtree: true }); }

})();
