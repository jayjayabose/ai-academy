#!/usr/bin/env node
/**
 * Generates seed-leads.csv — the Day 1 CSV import source
 * (course/guidebook/companion/day-1/day-1-build-requirements.md:133-157).
 *
 *   node scripts/generate-seed-leads.mjs [count] [outfile]
 *
 * Deterministic: a fixed PRNG seed and a fixed reference date mean re-running
 * produces a byte-identical file. Regenerate freely without churning the diff.
 *
 * LEADS ONLY. Interactions are *generated* by the import script (2-5 per lead,
 * per `:139`), not read from this file.
 *
 * Emails use the RFC 2606 reserved `example.*` domains and phone numbers use the
 * 555-01xx block reserved for fiction, so nothing here can reach a real person.
 */

const COUNT = Number(process.argv[2] ?? 100);
const OUTFILE = process.argv[3] ?? 'seed-leads.csv';

// Fixed so inquiryDate spreads are stable across runs.
const REFERENCE_DATE = new Date('2026-08-01T00:00:00Z');
const SEED = 20260801;

/** mulberry32 — small, fast, deterministic. */
function makeRng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const rng = makeRng(SEED);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const intBetween = (min, max) => min + Math.floor(rng() * (max - min + 1));

/** Weighted pick: [[value, weight], ...] */
function weighted(pairs) {
    const total = pairs.reduce((sum, [, w]) => sum + w, 0);
    let roll = rng() * total;
    for (const [value, w] of pairs) {
        roll -= w;
        if (roll <= 0) return value;
    }
    return pairs[pairs.length - 1][0];
}

const FIRST_NAMES = [
    'Amara', 'Daniel', 'Priya', 'Marcus', 'Sofia', 'Ethan', 'Leila', 'Jonah',
    'Naomi', 'Andre', 'Wei', 'Rosa', 'Tobias', 'Yuki', 'Grace', 'Malik',
    'Ingrid', 'Rafael', 'Hana', 'Desmond', 'Clara', 'Omar', 'Freya', 'Julian',
    'Nadia', 'Theo', 'Simone', 'Kwame', 'Elena', 'Victor', 'Anya', 'Felix',
    'Maya', 'Isaac', 'Camille', 'Dmitri', 'Aisha', 'Lucas', 'Bianca', 'Noor',
];

const LAST_NAMES = [
    'Okafor', 'Whitfield', 'Raman', 'Delgado', 'Lindqvist', 'Barnes', 'Haddad',
    'Mercer', 'Tanaka', 'Boateng', 'Villareal', 'Novak', 'Fitzgerald', 'Nakamura',
    'Osei', 'Kowalski', 'Ferreira', 'Bergman', 'Castellanos', 'Ahmed', 'Sinclair',
    'Petrova', 'Mwangi', 'Doyle', 'Reyes', 'Halvorsen', 'Ibrahim', 'Chastain',
    'Vogel', 'Santos', 'Kaur', 'Brennan', 'Moreau', 'Espinoza', 'Lindgren',
    'Abara', 'Cortez', 'Halloran', 'Nguyen', 'Rossi',
];

// A single coherent market (Denver metro) reads more like a real CRM than
// scattered national data, and makes location filtering meaningful.
const LOCATIONS = [
    'Highlands', 'Washington Park', 'Cherry Creek', 'Capitol Hill', 'RiNo',
    'Berkeley', 'Sloan Lake', 'Golden', 'Littleton', 'Arvada', 'Lakewood',
    'Aurora', 'Boulder', 'Superior', 'Englewood', 'Centennial', 'Broomfield',
    'Westminster', 'Wheat Ridge', 'Louisville',
];

const EMAIL_DOMAINS = ['example.com', 'example.net', 'example.org'];

// Colorado codes for local buyers, plus common relocation origins — several
// leads are moving for work. All real, assignable area codes (no toll-free).
const AREA_CODES = [303, 720, 970, 719, 312, 415, 512, 602, 773, 206, 617, 214];

/** Bedroom counts that make sense for the property type. */
const BEDROOM_RANGE = {
    'single-family': [2, 5],
    condo: [1, 3],
    townhouse: [2, 4],
    'multi-family': [3, 6],
    land: [0, 0],
};

const PROPERTY_TYPES = [
    ['single-family', 45], ['condo', 22], ['townhouse', 20],
    ['multi-family', 8], ['land', 5],
];

const STATUSES = [
    ['active', 30], ['contacted', 27], ['qualified', 21], ['closed', 12], ['lost', 10],
];

const SOURCES = [
    ['referral', 24], ['website', 23], ['zillow', 18], ['open-house', 15],
    ['social-media', 10], ['cold-call', 6], ['walk-in', 4],
];

const MOTIVATIONS = [
    'Relocating for work, starting in the spring.',
    'First-time buyer, pre-approved with a local credit union.',
    'Downsizing now that the kids have moved out.',
    'Investor looking for rental yield, not owner-occupied.',
    'Upsizing after a second child.',
    'Moving closer to aging parents.',
    'Currently renting, lease ends soon.',
    'Selling a current home and buying in the same window.',
    'Cash buyer, no financing contingency.',
    'Second home, plans to use it seasonally.',
];

const CONSTRAINTS = [
    'Wants a walkable neighborhood.',
    'School district is the deciding factor.',
    'Needs a garage and a yard for two dogs.',
    'Prefers new construction, dislikes fixer-uppers.',
    'Open to a renovation if the price is right.',
    'Hard ceiling on budget, will not stretch.',
    'Needs a dedicated home office.',
    'Wants to stay under a 30-minute commute downtown.',
    'Timeline is flexible, waiting for the right property.',
    'Has already lost out on two bids.',
    'Only interested in single-story layouts.',
    'HOA fees are a sticking point.',
];

/** Budget correlates loosely with property type and bedroom count. */
function budgetFor(propertyType, bedrooms) {
    const base = {
        'single-family': 520_000,
        condo: 340_000,
        townhouse: 425_000,
        'multi-family': 780_000,
        land: 260_000,
    }[propertyType];

    const perBedroom = propertyType === 'land' ? 0 : bedrooms * 62_000;
    const jitter = Math.round((rng() - 0.4) * 190_000);
    const raw = base + perBedroom + jitter;

    // Round to the nearest 5k the way people actually state a budget.
    return Math.max(180_000, Math.round(raw / 5000) * 5000);
}

function isoDateDaysAgo(days) {
    const d = new Date(REFERENCE_DATE.getTime() - days * 86_400_000);
    return d.toISOString().slice(0, 10);
}

/** RFC 4180: quote when the value contains a comma, quote or newline. */
function csvField(value) {
    const s = String(value);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

// camelCase headers map straight onto model attributes; the snake_case
// translation happens at the DB boundary via `underscored: true`.
// `bedrooms` is deliberately empty for land — NULL means "not applicable",
// whereas 0 would be a claim that a parcel has zero bedrooms.
const HEADERS = [
    'firstName', 'lastName', 'email', 'phone', 'status', 'budget', 'location',
    'propertyType', 'bedrooms', 'source', 'inquiryDate', 'notes',
];

const seenEmails = new Set();
const rows = [];

for (let i = 0; i < COUNT; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);

    let localPart = `${first}.${last}`.toLowerCase();
    if (seenEmails.has(localPart)) localPart = `${localPart}${i}`;
    seenEmails.add(localPart);

    const propertyType = weighted(PROPERTY_TYPES);
    // Draw unconditionally so the PRNG sequence (and therefore every other
    // field) stays stable regardless of property type.
    const bedroomsDrawn = intBetween(...BEDROOM_RANGE[propertyType]);
    const bedrooms = propertyType === 'land' ? '' : bedroomsDrawn;
    const status = weighted(STATUSES);

    // Closed and lost leads skew older; active ones are recent. This gives the
    // Day 2 activity-scoring feature a real recency signal to work with.
    const maxAge = status === 'closed' || status === 'lost' ? 270 : 150;
    const inquiryDate = isoDateDaysAgo(intBetween(3, maxAge));

    const notes = rng() < 0.75 ? `${pick(MOTIVATIONS)} ${pick(CONSTRAINTS)}` : pick(MOTIVATIONS);

    rows.push([
        first,
        last,
        `${localPart}@${pick(EMAIL_DOMAINS)}`,
        `(${pick(AREA_CODES)}) 555-0${intBetween(100, 199)}`,
        status,
        budgetFor(propertyType, bedrooms),
        pick(LOCATIONS),
        propertyType,
        bedrooms,
        weighted(SOURCES),
        inquiryDate,
        notes,
    ]);
}

const csv = [HEADERS, ...rows].map((row) => row.map(csvField).join(',')).join('\n') + '\n';

const { writeFileSync } = await import('node:fs');
writeFileSync(OUTFILE, csv, 'utf8');

console.log(`✓ wrote ${OUTFILE} — ${rows.length} leads, ${HEADERS.length} columns`);
