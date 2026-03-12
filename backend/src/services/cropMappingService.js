const normalize = (value) => String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

const cropsRoughlyMatch = (a, b) => {
    const na = normalize(a);
    const nb = normalize(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    if (na.includes(nb) || nb.includes(na)) return true;
    return false;
};

const getAllCropNames = (crop) => {
    const names = [];
    if (crop && typeof crop.name === 'string') names.push(crop.name);
    const t = crop?.translations;
    if (t && typeof t === 'object') {
        for (const v of Object.values(t)) {
            if (typeof v === 'string' && v.trim()) names.push(v);
        }
    }
    return names;
};

const mapDetectedCropToId = (detectedCropName, crops) => {
    const needle = normalize(detectedCropName);
    if (!needle) return null;
    for (const c of crops || []) {
        const names = getAllCropNames(c);
        if (names.some(n => cropsRoughlyMatch(n, detectedCropName))) return c.id;
    }
    const direct = (crops || []).find(c => getAllCropNames(c).some(n => normalize(n) === needle));
    return direct ? direct.id : null;
};

module.exports = {
    normalize,
    cropsRoughlyMatch,
    mapDetectedCropToId
};
