import type { OperatorFacility, OperatorPayload } from '@/api/types';
import type { GlanceRow, JumpItem, PersonEntry, StatTile } from '@/components/site';
import { aliasLabel } from '@/lib/alias';

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function aliasLines(o: OperatorPayload): string[] {
  return [
    ...(o.full_name && o.full_name !== o.name ? [o.full_name] : []),
    ...(o.current_name ? [aliasLabel('current', o.current_name)] : []),
    ...(o.aka ?? []).map((n) => aliasLabel('other', n)),
  ];
}

export type Program = OperatorFacility & { homes?: OperatorFacility[] };

/** The programs with their homes under them (program_tree), else the flat list. */
export function programList(o: OperatorPayload): Program[] {
  return o.program_tree?.length ? o.program_tree : (o.facilities ?? []);
}

/** "6 programs, 2 open, in 2 places". */
export function placeLine(o: OperatorPayload): string {
  const n = (o.facilities?.length ?? 0) || programList(o).length;
  if (!n) return '';
  const where = o.place_count > 0 ? ` in ${count(o.place_count, 'place', 'places')}` : '';
  const open = o.open_count > 0 ? `, ${o.open_count} open` : '';
  return `${count(n, 'program', 'programs')}${open}${where ? `,${where}` : ''}`;
}

/** Leaders first, then the others. */
export function peopleList(o: OperatorPayload): PersonEntry[] {
  return [...(o.people?.leaders ?? []), ...(o.people?.others ?? [])];
}

/** A fact's value is a word or a list of them (founders): one line each. */
const factText = (v: unknown): string => (Array.isArray(v) ? v.join('\n') : String(v ?? ''));

export function glanceRows(o: OperatorPayload): GlanceRow[] {
  const rows: GlanceRow[] = (o.facts ?? []).map((f) => ({ label: f.label, value: factText(f.value) }));
  if (o.parents?.length) {
    rows.push({ label: o.parents.length > 1 ? 'Parent companies' : 'Parent company', value: o.parents.map((p) => p.name).join('\n') });
  }
  // US states and other countries counted apart, as the website's fact box does (place_count before they were split).
  const states = o.state_count ?? 0;
  const countries = o.country_count ?? 0;
  if (states > 0) rows.push({ label: states === 1 ? 'State' : 'States', value: String(states) });
  if (countries > 0) rows.push({ label: countries === 1 ? 'Country outside the US' : 'Countries outside the US', value: String(countries) });
  if (!states && !countries && o.place_count > 0) rows.push({ label: 'States and countries', value: String(o.place_count) });
  return rows;
}

export function statTiles(o: OperatorPayload): StatTile[] {
  return [
    { key: 'deaths', icon: 'candle', count: o.memorials?.length ?? 0, singular: 'death on record', plural: 'deaths on record', tone: 'grave' },
    { key: 'lawsuits', icon: 'scale', count: o.lawsuits?.length ?? 0, singular: 'lawsuit', plural: 'lawsuits', tone: 'warn' },
    { key: 'news', icon: 'newspaper', count: o.news?.length ?? 0, singular: 'news story', plural: 'news stories', tone: 'info' },
    { key: 'programs', icon: 'building', count: programList(o).length, singular: 'program', plural: 'programs', tone: 'info' },
    { key: 'people', icon: 'users', count: peopleList(o).length, singular: 'person', plural: 'people', tone: 'info' },
  ];
}

/** True when the company's About has something to print. */
export const aboutOf = (o: OperatorPayload): boolean =>
  !!o.about && ((o.about.paragraphs?.length ?? 0) > 0 || (o.about.also ?? []).some((a) => a.url));

/** The sections this company has, in page order, for the jump pills. */
export function sectionsOf(o: OperatorPayload): JumpItem[] {
  const list: [string, string, unknown][] = [
    ['history', 'History', o.history?.paragraphs?.length],
    ['about', 'About', aboutOf(o)],
    ['years', 'Year by year', o.timeline?.length],
    ['programs', 'Programs', programList(o).length],
    ['related', 'Related programs', o.related?.length],
    ['people', 'People', peopleList(o).length],
    ['ownership', 'Ownership', (o.parents?.length ?? 0) + (o.subsidiaries?.length ?? 0)],
    ['news', 'News', o.news?.length],
    ['lawsuits', 'Lawsuits', o.lawsuits?.length],
    ['deaths', 'Deaths', o.memorials?.length],
    ['tax-filings', 'Tax filings', o.nonprofits?.length],
    ['business-filings', 'Business filings', o.businesses?.length],
    ['documents', 'Documents', o.documents?.url],
    ['materials', 'Materials and links', (o.resource_links ?? []).some((g) => g.links?.length)],
    ['websites', 'Websites', o.websites?.length],
    // The notes are the About's prose on the website; the list stays for a company without one.
    ['notes', 'Notes', aboutOf(o) ? 0 : o.notes?.length],
  ];
  return list.filter(([, , has]) => !!has).map(([key, label]) => ({ key, label }));
}
