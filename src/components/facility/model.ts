import type { Era, EraKind, FacilityPayload, Sibling, StaffEntry } from '@/api/types';
import type { Tone } from '@/theme/colors';
import type { IconName } from '../Icon';

/** Tells a section where it sits, so the screen can scroll to it (SectionBlock's onLayoutY). */
export type SectionProps = { onLayoutY: (id: string, y: number) => void };

/** An approved serious finding (inspections.violations), a field the shared FacilityPayload type does not list. */
export type Violation = {
  id: number;
  category?: string;
  label: string;
  severe?: boolean;
  date_label?: string;
  short?: string;
  excerpt?: string;
  source_url?: string;
  home?: string;
};

type WithViolations = { violations?: Violation[] } | null | undefined;

/** The record's own findings plus its homes' (kop_facility_pages: program_homes.violations), each counted once. */
export function violationsOf(f: FacilityPayload): Violation[] {
  const seen = new Set<number>();
  const out: Violation[] = [];
  for (const v of [...((f.inspections as WithViolations)?.violations ?? []), ...((f.program_homes as WithViolations)?.violations ?? [])]) {
    if (!v || seen.has(v.id)) continue;
    seen.add(v.id);
    out.push(v);
  }
  return out;
}

const STAFF_LABELS: Record<string, string> = {
  administrator: 'Administration',
  notableStaff: 'Notable staff',
  pastTTIJobs: 'Staff who came from other programs',
};

export type StaffRow = { entry: StaffEntry; head?: string };

/** Every staff entry in the site's group order; the first of each group carries its sub-head. */
export function staffRows(staff: FacilityPayload['staff']): StaffRow[] {
  const groups: [string, StaffEntry[]][] = Array.isArray(staff)
    ? [['', staff]]
    : Object.entries(staff ?? {}).filter((g): g is [string, StaffEntry[]] => Array.isArray(g[1]));
  const rank = (k: string) => {
    const i = Object.keys(STAFF_LABELS).indexOf(k);
    return i < 0 ? 99 : i;
  };
  groups.sort((a, b) => rank(a[0]) - rank(b[0]));
  const rows: StaffRow[] = [];
  for (const [key, all] of groups) {
    // As the site: people with nothing else on record (no other job, no relation) go after the rest, where the
    // section's "more" button holds them (templates/facility-page.php, Claude note #15).
    const linked = all.filter((e) => e.career?.length || e.relations?.length);
    const alone = all.filter((e) => !(e.career?.length || e.relations?.length));
    const entries = linked.length && alone.length >= 4 ? [...linked, ...alone] : all;
    const head = key ? (STAFF_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())) : undefined;
    entries.forEach((entry, i) => rows.push({ entry, head: i === 0 ? head : undefined }));
  }
  return rows;
}

/** Facts whose value is a list on the site ("Past operators") arrive as an array. */
export function factText(value: unknown): string {
  return (Array.isArray(value) ? value : [value]).map((v) => String(v ?? '').trim()).filter(Boolean).join('\n');
}

export const isClosed = (f: FacilityPayload) => (f.status ?? '').trim().toLowerCase() === 'closed';

/** The homes list on a program page, or the program's other homes on a home's page. */
export function homeRows(f: FacilityPayload): { isProgram: boolean; homes: { id: string; title: string; meta: string; url: string }[] } {
  const own = f.program_homes?.homes ?? [];
  if (own.length) {
    return {
      isProgram: true,
      homes: own.map((h) => {
        const title = h.home_name || h.name;
        const bits = [h.home_name && h.home_name !== h.name ? h.name : '', h.place, h.years, h.status && h.status !== 'Unknown' ? h.status : ''];
        return { id: String(h.id), title, meta: bits.filter(Boolean).join(' | '), url: h.url };
      }),
    };
  }
  const others: Sibling[] = f.home_of?.others ?? [];
  return {
    isProgram: false,
    homes: others.map((s) => ({
      id: s.url || s.name,
      title: s.name,
      meta: [s.place, s.status && s.status !== 'Unknown' ? s.status : ''].filter(Boolean).join(' | '),
      url: s.url,
    })),
  };
}

/** A renamed program's names, earliest first; empty when the page is not cut. */
export const erasOf = (f: FacilityPayload): Era[] => f.eras?.list ?? [];

/**
 * The page the plain sections draw: on a renamed program's page each name's section holds what is dated to
 * its years (another name's record included), so the plain sections keep only what no name took (eras.rest),
 * as the website's template does.
 */
export function pageView(f: FacilityPayload): FacilityPayload {
  const rest = f.eras?.rest;
  if (!erasOf(f).length || !rest) return f;
  return {
    ...f,
    memorials: rest.memorials ?? [],
    lawsuits: rest.lawsuits ?? [],
    incidents: rest.incidents ?? [],
    news: rest.news ?? [],
    staff: rest.staff ?? {},
    inspections: f.inspections ? { ...f.inspections, violations: rest.violations ?? [] } : f.inspections,
  };
}

/** The kinds a name's section lists, in the website's order, with their headings. */
export const ERA_KINDS: { kind: EraKind; label: string; icon: IconName }[] = [
  { kind: 'memorials', label: 'Deaths on record', icon: 'candle' },
  { kind: 'violations', label: 'Serious violations', icon: 'alert-triangle' },
  { kind: 'lawsuits', label: 'Lawsuits', icon: 'scale' },
  { kind: 'incidents', label: 'Incidents on record', icon: 'siren' },
  { kind: 'news', label: 'News coverage', icon: 'newspaper' },
  { kind: 'staff', label: 'Staff', icon: 'users' },
];

export const eraCount = (era: Era, kind: EraKind) =>
  kind === 'staff' ? staffRows(era.staff).length : (era[kind] as unknown[] | undefined)?.length ?? 0;

/** Where a stat tile jumps: its own section, or on a renamed program's page the first name that has the kind. */
export function tileAnchor(f: FacilityPayload, kind: string): string {
  const era = erasOf(f).find((e) => (ERA_KINDS.some((k) => k.kind === kind) ? eraCount(e, kind as EraKind) > 0 : false));
  if (era) return era.id;
  // Every incident told in the timeline (none undated left): the tile jumps there, as on the website.
  if (kind === 'incidents' && !pageView(f).incidents.length && (f.timeline?.length ?? 0) > 0) return 'timeline';
  return kind;
}

export type SectionDef = { id: string; label: string };

/** The sections this record has, in page order, with the short names the jump pills use. */
export function presentSections(page: FacilityPayload): SectionDef[] {
  const f = pageView(page);
  const homes = homeRows(f);
  const forum = f.forum;
  const forumHas = !!(forum && (forum.leads?.length || forum.links?.length));
  const staff = staffRows(f.staff);
  const about = f.about;
  const hasAboutText = !!about && ((about.paragraphs?.length ?? 0) > 0 || (about.also ?? []).some((a) => a.url));
  const campus = f.campus?.others?.length ?? 0;
  const pick = (list: [boolean, string, string][]) => list.filter((s) => s[0]).map(([, id, label]) => ({ id, label }));
  // The website's order (templates/facility-page.php): the record's story first, then each name's section, then the lists.
  const profile = f.profile;
  const profileLead = !!profile && (profile.lead.length > 0 || profile.facts.length > 0);
  // The post's own written sections (the rest join the record's sections, components/record/Profile.tsx).
  const joins = ['testimony', 'news', 'lawsuits', 'documents', 'videos', 'related'];
  const firstProse = profile?.sections.find((s) => !joins.includes(s.kind));
  const profileAnchor = profileLead ? 'profile' : firstProse ? `profile-${firstProse.id}` : '';
  const before = pick([
    [(f.history?.paragraphs?.length ?? 0) > 0, 'history', 'History'],
    [profileAnchor !== '', profileAnchor, 'Profile'],
    [homes.homes.length > 0, 'homes', homes.isProgram ? 'Homes' : 'Other homes'],
    [campus > 0, 'campus', 'Same campus'],
    [hasAboutText || f.field_notes.length > 0, 'about', 'About'],
    [!hasAboutText && f.notes.length > 0, 'notes', 'Research notes'],
    [f.testimony.length + (f.readers?.length ?? 0) > 0, 'testimony', 'Survivor testimony'],
    [forumHas, 'forum', 'Forums'],
    [(f.timeline?.length ?? 0) > 0, 'timeline', 'Timeline'],
  ]);
  const after = pick([
    [f.memorials.length > 0, 'memorials', 'Deaths on record'],
    [violationsOf(f).length > 0, 'violations', 'Serious violations'],
    [f.lawsuits.length > 0, 'lawsuits', 'Lawsuits'],
    [(f.federal_funding?.length ?? 0) > 0, 'funding', 'Federal funding'],
    [(f.nonprofits?.length ?? 0) > 0, 'tax-filings', 'Tax filings'],
    [(f.businesses?.length ?? 0) > 0, 'business-filings', 'Business filings'],
    [f.incidents.length > 0, 'incidents', 'Incidents'],
    [f.news.length > 0, 'news', 'News coverage'],
    [f.videos.length > 0, 'videos', 'Videos'],
    [staff.length > 0, 'staff', 'Staff'],
    [f.practices.length > 0 || (f.rules?.length ?? 0) > 0 || (f.reader_rules?.length ?? 0) > 0, 'practices', 'Rules and practices'],
    [!!f.inspections && (!!f.inspections.summary || f.inspections.reports.length > 0 || f.inspections.total > 0), 'inspections', 'Licensing'],
    [(page.network?.links.length ?? 0) > 0, 'network', 'Connections'],
    [!!f.documents?.url || (f.research?.length ?? 0) > 0 || (f.archives?.length ?? 0) > 0, 'documents', 'Documents'],
    [f.wiki.length > 0, 'wiki', 'Wiki entries'],
    [f.siblings.length > 0, 'related', 'Same operator'],
    [f.profile_links.length > 0 || f.resource_links.length > 0, 'resources', 'Materials and links'],
  ]);
  const names = erasOf(f).map((e) => ({ id: e.id, label: `As ${e.name}` }));
  return [...before, ...names, ...after];
}

/** The record in numbers, worst first (template: $kop_fp_tiles). */
export function statTiles(f: FacilityPayload): {
  key: string; icon: IconName; count: number; singular: string; plural: string; tone: Tone;
}[] {
  // A renamed program counts the whole page, every name's section and the rest (eras.totals).
  const t = erasOf(f).length ? f.eras?.totals ?? {} : {};
  const n = (kind: EraKind, own: number) => t[kind] ?? own;
  return [
    { key: 'memorials', icon: 'candle', count: n('memorials', f.memorials.length), singular: 'death on record', plural: 'deaths on record', tone: 'grave' },
    {
      key: 'violations', icon: 'alert-triangle', count: n('violations', violationsOf(f).length),
      singular: 'serious violation confirmed by inspectors', plural: 'serious violations confirmed by inspectors', tone: 'grave',
    },
    { key: 'lawsuits', icon: 'scale', count: n('lawsuits', f.lawsuits.length), singular: 'lawsuit', plural: 'lawsuits', tone: 'warn' },
    { key: 'incidents', icon: 'siren', count: f.incidents_total ?? n('incidents', f.incidents.length), singular: 'incident on record', plural: 'incidents on record', tone: 'warn' },
    { key: 'news', icon: 'newspaper', count: n('news', f.news.filter((x) => !x.passing).length), singular: 'news article', plural: 'news articles', tone: 'info' },
    { key: 'staff', icon: 'users', count: n('staff', staffRows(f.staff).length), singular: 'staff member named', plural: 'staff members named', tone: 'info' },
  ];
}
