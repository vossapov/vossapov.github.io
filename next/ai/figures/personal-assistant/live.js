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

// Personal robot model: one household robot rides a floor rail behind three stations and works
// them in turn: bookkeeping at a desk, diagnosing an opened appliance, watering three pots.
// Pure and deterministic: the whole state is a function of time. No personal data, no money,
// no invented statistics: the readout only counts what this demo has done.

const L = {
  work: -12,                                  // y of every work point (under the boom tip)
  rail: { y: -92, x0: -214, x1: 214 },
  desk: { inbox: -161, book: -105, top: 22 },
  appliance: { x: 0, parts: [-24, 0, 24], top: 20 },
  pots: [121, 151, 181], soil: 21,
  park: 0,
  tool: 50,                                   // z of the jaw tips with the tool raised
  slip: 0.8, tray: 23, page: 25, part: 15, pour: 46,
};

const T = { travel: 1.8, reach: 0.6, retract: 0.6, pick: 2.1, probe: 1.7, verdict: 1.4, pour: 1.4 };
const RECEIPTS_PER_VISIT = 2;
// Components that can be at fault, and the fixed order of faults the demo diagnoses.
const PARTS = ['heater', 'fuse', 'thermostat'];
const FAULTS = [1, 0, 2];

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (v) => { const t = clamp(v); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const bump = (u) => (u < 0.3 ? ease(u / 0.3) : u < 0.7 ? 1 : 1 - ease((u - 0.7) / 0.3)); // down, hold, up

// Work time of each visit after the robot has arrived and lowered its tool.
const WORK = [RECEIPTS_PER_VISIT * T.pick, 2 * T.probe + T.verdict, L.pots.length * T.pour];
const VISIT = WORK.map((w) => T.travel + T.reach + w + T.retract);
const CYCLE = VISIT.reduce((a, b) => a + b, 0);
const STATION_X = [L.desk.inbox, L.appliance.x, L.pots[0]];

// Where the visit `v` (counted from 0, cycling ledger → appliance → plants) starts.
const visitStart = (v) => Math.floor(v / 3) * CYCLE + VISIT.slice(0, v % 3).reduce((a, b) => a + b, 0);
function visitAt(t) {
  let v = Math.floor(t / CYCLE) * 3, s = visitStart(v);
  while (s + VISIT[v % 3] <= t) { s += VISIT[v % 3]; v++; }
  return { v, s, r: t - s };
}
// Pour ends for one pot, newest first, up to time t (the pour is the middle half of its slot).
function pourEnds(t, pot) {
  const { v } = visitAt(t), out = [];
  for (let w = v; w >= 0 && out.length < 2; w--) {
    if (w % 3 !== 2) continue;
    const end = visitStart(w) + T.travel + T.reach + pot * T.pour + T.pour * 0.85;
    if (end - T.pour * 0.5 <= t) out.push(end);
  }
  return out;
}
// Soil moisture: dries from 1 toward 0.35 over one cycle; a pour fills it from where it was.
const dried = (age) => 0.35 + 0.65 * (1 - clamp(age / CYCLE));
function moistureAt(t, pot) {
  const [end, before] = pourEnds(t, pot);
  if (end == null) return 0.35;
  const start = end - T.pour * 0.5, was = before == null ? 0.35 : dried(start - before);
  return t >= end ? dried(t - end) : was + (1 - was) * ease((t - start) / (T.pour * 0.5));
}
const faultOf = (v) => FAULTS[Math.floor(v / 3) % FAULTS.length];
const endX = (v) => (v < 0 ? L.park : v % 3 === 0 ? L.desk.book : v % 3 === 1 ? L.appliance.parts[faultOf(v)] : L.pots[L.pots.length - 1]);
// The fault found by the most recent diagnosis, shown until the robot probes the appliance again.
function shownFault(t) {
  const { v, r } = visitAt(t);
  if (v % 3 === 1 && r >= T.travel) return r >= T.travel + T.reach + T.probe * 1.6 ? faultOf(v) : -1;
  for (let w = v; w >= 0; w--) if (w % 3 === 1 && w !== v) return faultOf(w);
  return -1;
}
// Counts of finished work, derived from time alone.
function counts(t) {
  const { v, s } = visitAt(t);
  const done = [0, 0, 0];
  for (let w = 0; w < v; w++) done[w % 3]++;
  const r = t - s, k = v % 3, start = T.travel + T.reach;
  let receipts = done[0] * RECEIPTS_PER_VISIT, diagnosed = done[1], watered = done[2] * L.pots.length;
  if (k === 0) receipts += Math.min(RECEIPTS_PER_VISIT, Math.floor(clamp((r - start) / T.pick, 0, 9) + 0.28));
  if (k === 1 && r >= start + 2 * T.probe) diagnosed++;
  if (k === 2) watered += Math.min(L.pots.length, Math.floor(clamp((r - start) / T.pour, 0, 9) + 0.5));
  return { receipts, diagnosed, watered };
}

function stateAt(t) {
  const { v, s, r } = visitAt(t), k = v % 3;
  const S = {
    t, visit: v, station: k, phase: 'travel', x: STATION_X[k], drop: 0, jaw: 0, needle: 0,
    held: null, fault: -1, probing: -1, pouring: -1, drops: 0, counts: counts(t), word: 'moving',
    inbox: 5, entries: 0, counterF: 0, filed: 0, tipZ: L.tool, moisture: L.pots.map((_, i) => moistureAt(t, i)),
  };
  const from = endX(v - 1);
  const start = T.travel + T.reach, w = r - start;
  // Ledger: entries and the counter follow the receipts; the inbox refills while the robot is away.
  S.counterF = S.counts.receipts;
  S.entries = S.counts.receipts ? (S.counts.receipts - 1) % 8 + 1 : 0;
  if (r < T.travel) {
    S.x = lerp(from, STATION_X[k], ease(r / T.travel));
    S.word = 'moving';
  } else if (r < start) {
    S.phase = 'reach';
    S.drop = 0;
    S.word = ['books', 'diagnosis', 'watering'][k];
  } else if (w < WORK[k]) {
    S.phase = 'work';
    S.word = ['books', 'diagnosis', 'watering'][k];
    if (k === 0) {
      const i = Math.floor(w / T.pick), u = (w - i * T.pick) / T.pick;
      // Back over the inbox, lower, close the jaws, lift, carry to the book, lower, open, lift.
      if (u < 0.12) S.x = i === 0 ? L.desk.inbox : lerp(L.desk.book, L.desk.inbox, ease(u / 0.12));
      else if (u < 0.42) S.x = L.desk.inbox;
      else if (u < 0.58) S.x = lerp(L.desk.inbox, L.desk.book, ease((u - 0.42) / 0.16));
      else S.x = L.desk.book;
      S.drop = u < 0.12 ? 0 : u < 0.42 ? bump((u - 0.12) / 0.3) : u < 0.58 ? 0 : u < 0.9 ? bump((u - 0.58) / 0.32) : 0;
      S.jaw = u >= 0.24 && u < 0.76 ? 1 : 0;
      if (S.jaw) S.held = { lift: S.drop };
      S.inbox = 5 - i - (u >= 0.24 ? 1 : 0);
      // Contact heights: the top receipt in the tray, then the top of the pile on the book.
      const before = S.counts.receipts - (u >= 0.72 ? 1 : 0);
      S.tipZ = u < 0.42 ? L.tray + (4 - i) * L.slip : L.page + Math.min(before, 4) * L.slip;
      if (u >= 0.72 && u < 0.76) S.filed = -1;
      // The counter turns while the receipt is laid on the book; the count steps when it is done.
      S.counterF = S.counts.receipts + (u >= 0.5 && u < 0.72 ? ease((u - 0.5) / 0.22) : 0);
    } else if (k === 1) {
      const fault = faultOf(v), ok = (fault + 1) % 3;
      if (w < 2 * T.probe) {
        const i = w < T.probe ? 0 : 1, u = (w - i * T.probe) / T.probe, part = i === 0 ? ok : fault;
        const goFrom = i === 0 ? L.appliance.x : L.appliance.parts[ok];
        S.x = lerp(goFrom, L.appliance.parts[part], ease(u / 0.25));
        S.drop = u < 0.25 ? 0 : bump((u - 0.25) / 0.75);
        S.probing = part;
        S.tipZ = L.part;
        S.needle = (part === fault ? 1 : 0.45) * ease((u - 0.45) / 0.2) * (1 - ease((u - 0.85) / 0.15));
      } else {
        S.x = L.appliance.parts[fault]; S.word = 'fault';
      }
    } else {
      const i = Math.floor(w / T.pour), u = (w - i * T.pour) / T.pour;
      S.x = i === 0 ? L.pots[0] : lerp(L.pots[i - 1], L.pots[i], ease(u / 0.25));
      S.drop = u < 0.25 ? 0 : bump((u - 0.25) / 0.75) * 0.5;
      S.pouring = u > 0.35 && u < 0.85 ? i : -1;
      S.tipZ = L.pour;
      S.drops = S.pouring >= 0 ? (u - 0.35) / 0.5 : 0;
    }
  } else {
    S.phase = 'retract';
    S.x = endX(v);
    S.word = k === 1 ? 'fault' : 'moving';
  }
  S.fault = shownFault(t);
  // Receipts filed on the book's left page (the pile never grows past five).
  S.filed = Math.min(5, S.counts.receipts - (S.filed === -1 ? 1 : 0));
  S.toolZ = -(L.tool - S.tipZ) * S.drop;
  // Inbox: back to five while the robot is elsewhere (new receipts arrive).
  if (k !== 0) S.inbox = 5 - (k === 1 && r < T.travel ? 2 * (1 - ease(r / T.travel)) : 0) | 0;
  return S;
}

const WORDS = {
  en: { moving: 'moving', books: 'bookkeeping', diagnosis: 'diagnosing', fault: 'fault', watering: 'watering', parts: ['heater', 'fuse', 'thermostat'] },
  ua: { moving: 'переїжджає', books: 'бухгалтерія', diagnosis: 'діагностика', fault: 'несправність', watering: 'полив', parts: ['нагрівач', 'запобіжник', 'терморегулятор'] },
};
function readout(S, lang) {
  const c = S.counts, W = WORDS[lang];
  const word = S.word === 'fault' && S.fault >= 0 ? W.fault + ': ' + W.parts[S.fault] : W[S.word];
  return lang === 'ua'
    ? `чеків ${c.receipts} · діагнозів ${c.diagnosed} · полито ${c.watered} · ${word}`
    : `receipts ${c.receipts} · diagnosed ${c.diagnosed} · watered ${c.watered} · ${word}`;
}
function describe(S, lang) {
  const W = WORDS[lang];
  const last = S.fault >= 0 ? (lang === 'ua' ? ' · знайдено: ' : ' · found: ') + W.parts[S.fault] : '';
  return readout(S, lang) + last;
}
// The reduced-motion still: second cycle, at the appliance, fault marked, everything else busy.
const STILL_T = visitStart(4) + T.travel + T.reach + 2 * T.probe + T.verdict * 0.5;

// Moving and rebuilt parts of the personal robot, shared by build.mjs (initial and still markup)
// and the live script (each frame). Only kit functions are used, so it inlines into live.js.



const SLIP = { w: 26, d: 18 };
const slip = (x, y, z, P, j) => {
  const dx = [0, 1.2, -0.8, 0.6, -1.1, 0.4][j % 6], dy = [0, -0.7, 0.9, 0.5, -0.4, 0.8][j % 6];
  const plan = { x: x - SLIP.w / 2 + dx, y: y - SLIP.d / 2 + dy, w: SLIP.w, d: SLIP.d, r: 0.6 };
  return solidSvg(slabOf(plan, z, 0.6, P, 2), { tone: 'hi', crease: 'lo' });
};
// A pile of receipts; only the top one shows its printed rows.
function pileSvg(n, x, y, z, P) {
  let s = '';
  for (let j = 0; j < n; j++) s += slip(x, y, z + j * L.slip, P, j);
  if (n) {
    const top = z + (n - 1) * L.slip + 0.6, j = n - 1, dx = [0, 1.2, -0.8, 0.6, -1.1, 0.4][j % 6], dy = [0, -0.7, 0.9, 0.5, -0.4, 0.8][j % 6];
    let d = '';
    [[-9, -5, 12], [-9, -2, 16], [-9, 1, 9], [-9, 5, 6]].forEach(([a, b, w]) => { d += lineOnTop([x + a + dx, y + b + dy], [x + a + w + dx, y + b + dy], top, P); });
    s += lineSvg(d, { tone: 'lo', free: true });
  }
  return s;
}
// The receipt held in the jaws, drawn at x = 0 in the arm's group and moved with the tool.
const heldSvg = (P) => pileSvg(1, 0, L.work, L.tool, P);

// Ledger entries on the right page: printed rows, marked free.
function entriesSvg(n, P) {
  let d = '';
  for (let i = 0; i < n; i++) { const y = L.work - 10.4 + i * 2.8, w = [17, 13, 19, 11, 15, 18, 12, 16][i]; d += lineOnTop([-85, y], [-85 + w, y], L.page + 0.05, P); }
  return n ? lineSvg(d, { tone: 'mid', free: true }) : '';
}

// Needle of the counter on the adding machine (one tenth of a turn per receipt).
function counterSvg(f, P) {
  const c = [-79, -36, 34.2], a = f * Math.PI / 5 - Math.PI / 2;
  return lineSvg(pathOf([iso([c[0] - Math.cos(a) * 1.2, c[1] - Math.sin(a) * 1.2, c[2]], P), iso([c[0] + Math.cos(a) * 4.2, c[1] + Math.sin(a) * 4.2, c[2]], P)]), { tone: 'hi', free: true });
}

// The chest gauge: a needle on the robot's front face, swinging from rest (0) to full scale (1).
function gaugeSvg(v, P) {
  const m = sideMatrix([0, -80], 0, P, 'left');
  const a = Math.PI * (1.15 - 0.8 * v), r = 6.2;
  const tip = [Math.cos(a) * r, -60 - Math.sin(a) * r];
  return `<g transform="${m}">${lineSvg(`M0 -60L${tip[0].toFixed(2)} ${tip[1].toFixed(2)}`, { tone: v > 0.9 ? 'red' : 'hi', free: true })}</g>`;
}

// Red marker on the faulty part's top face.
function faultSvg(i, P) {
  if (i < 0) return '';
  const x = L.appliance.parts[i], plan = { x: x - 9, y: L.work - 7, w: 18, d: 14, r: 2 };
  return `<path d="${planOutline(plan, 14.2, P, 3)}" fill="var(--anatomy-red)" fill-opacity=".22" stroke="var(--anatomy-red)" stroke-width="1.1"/>`;
}

// Soil in each pot darkens as it gets wet.
function soilSvg(m, x, P) {
  return `<path d="${ring(x, L.work, 9, L.soil, P, 32)}Z" fill="var(--anatomy-shade-0)" fill-opacity="${(0.25 + 0.6 * m).toFixed(3)}"/>`;
}

// Falling drops under the nozzle (phase 0..1 through a pour).
function dropsSvg(x, u, P) {
  if (u <= 0) return '';
  const pts = [];
  for (let j = 0; j < 6; j++) {
    const f = (u * 4 + j / 6) % 1, z = L.pour + 4 - f * (L.pour + 4 - L.soil);
    // From under the nozzle (+4.5, -4.5 from the tool centre), spreading a little as they fall.
    pts.push([...iso([x + 4.5 + [-1.5, 1, 0, 1.6, -0.8, 0.4][j] * f, L.work - 4.5 + [0.5, -1, 1.2, 0, -1.4, 0.6][j] * f, z], P), Math.min(1, (1 - f) * 3, f * 8)]);
  }
  return dotsSvg(pts, { size: 1.15, tone: 'mid' });
}

// Rigid moves and rebuilt markup for one state.
function poseOf(S, P) {
  const move = {
    robot: [S.x, 0, 0], arm: [S.x, 0, 0], tool: [0, 0, S.toolZ], 'tool-rod': [0, 0, S.toolZ],
    'jaw-l': [1.6 * S.jaw, 0, 0], 'jaw-r': [-1.6 * S.jaw, 0, 0],
  };
  L.pots.forEach((x, i) => { move['leaves-' + i] = [0, 0, 1.6 * S.moisture[i]]; move['stake-' + i] = [0, 0, 7 * S.moisture[i]]; });
  const html = {
    inbox: pileSvg(Math.max(0, S.inbox), L.desk.inbox, L.work, L.tray, P),
    filed: pileSvg(S.filed, L.desk.book, L.work, L.page, P),
    entries: entriesSvg(S.entries, P),
    counter: counterSvg(S.counterF, P),
    gauge: gaugeSvg(S.needle, P),
    fault: faultSvg(S.fault, P),
    held: S.held ? heldSvg(P) : '',
    drops: S.pouring >= 0 ? dropsSvg(S.x, S.drops, P) : '',
  };
  L.pots.forEach((x, i) => { html['soil-' + i] = soilSvg(S.moisture[i], x, P); });
  return { move, html };
}

const P={"origin":[348.98169582699705,269.22932795856167],"scale":1.226106129282434,"azimuth":60,"elevation":40},TEXT={"en":{"label":"Isometric household robot on a floor rail: it files receipts into a ledger, diagnoses an opened appliance with a probe and waters three pots."},"ua":{"label":"Ізометричний побутовий робот на рейці: вносить чеки до книги обліку, шукає несправність у відкритому приладі щупом і поливає три вазони."}};
// Live code for the personal robot. Inlined by build.mjs after the kit, model.mjs and pose.mjs,
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
  let t = 0, visible = false, wait = 1.4, last = 0, frame = 0;

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
    for (const [name, html] of Object.entries(Q.html)) if (parts[name] && shown[name] !== html) { parts[name].innerHTML = html; shown[name] = html; }
    figure.dataset.time = t.toFixed(2);
    figure.dataset.station = S.station;
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
  reduced.addEventListener('change', () => { if (reduced.matches) { cancelAnimationFrame(frame); frame = 0; t = STILL_T; draw(); } else { wait = 1.4; run(); } });
  // Test hook only (a custom event, never user input): jump to time `t` and hold there.
  figure.addEventListener('robot:seek', (e) => { t = e.detail.t; wait = 1e9; draw(); });
  if (reduced.matches) t = STILL_T;
  draw();
  words();
}
function find() { document.querySelectorAll('.iso-figure[data-figure="personal-assistant"]').forEach(mount); }
find();
new MutationObserver((list) => { if (list.some((m) => m.addedNodes.length)) find(); }).observe(document.documentElement, { childList: true, subtree: true });

})();
