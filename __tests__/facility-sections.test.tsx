/**
 * The facility sections no record in the first fixtures filled, drawn from real payloads
 * (scripts/test-mobile-api.php --dump in the theme repo): a renamed program's names, a program's
 * homes and a home's program, incidents, the forum block, survivor testimony and the sources on
 * the alias lines and former locations.
 */
import { fireEvent, render, screen, within } from '@testing-library/react-native';

import type { Era, FacilityPayload } from '@/api/types';
import FacilityScreen from '@/app/facility/[slug]';
import { pageView, staffRows, statTiles } from '@/components/facility/model';

const mockFacility: { current: FacilityPayload } = { current: require('./fixtures/facility-12155.json') };

jest.mock('@/api/queries', () => ({
  useFacility: () => ({ data: mockFacility.current, isLoading: false, isError: false, refetch: jest.fn() }),
}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ slug: 'x' }),
  useRouter: () => ({ push: jest.fn() }),
  Stack: { Screen: () => null },
}));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));

const load = (id: number): FacilityPayload => require(`./fixtures/facility-${id}.json`);
const copperCanyon = load(12155);
const canyonState = load(9605);
const rebekah = load(10865);
const provo = load(10371);
const newport = load(100284);
const acre = load(9758);
const acadia = load(12688);
const ascent = load(9688);

const show = async (f: FacilityPayload) => {
  mockFacility.current = f;
  await render(<FacilityScreen />);
};
const eras = (f: FacilityPayload): Era[] => f.eras?.list ?? [];
const names = (era: Era): string[] => staffRows(era.staff).map((r) => r.entry.name ?? '').filter(Boolean);
/** Text that a "(source)" link follows inside the same line. */
const startsWith = (text: string) => new RegExp(`^${text.slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);

describe('a renamed program: one section per name', () => {
  it('heads a section "As <name>" for each name, earliest first, with its years and operators', async () => {
    await show(copperCanyon);
    const list = eras(copperCanyon);
    expect(list.map((e) => e.name)).toEqual(['Copper Canyon Academy', 'Sedona Sky Academy']);
    for (const era of list) {
      expect(screen.getByLabelText(new RegExp(`^As ${era.name}`))).toBeTruthy();
      const meta = [era.years, era.operators.join(', ')].filter(Boolean).join(' | ');
      expect(screen.getByText(meta)).toBeTruthy();
      expect(screen.getByLabelText(`Jump to As ${era.name}`)).toBeTruthy();
    }
  });

  it("shows the other name's staff too, which the record's own lists never held", async () => {
    await show(copperCanyon);
    const sedona = eras(copperCanyon)[1];
    const own = new Set(staffRows(copperCanyon.staff).map((r) => r.entry.name));
    const theirs = names(sedona).filter((n) => !own.has(n));
    expect(theirs.length).toBeGreaterThan(0);
    for (const n of theirs) expect(screen.getAllByText(n).length).toBeGreaterThan(0);
  });

  it('links the record kept under the other name, and only that one', async () => {
    await show(copperCanyon);
    expect(eras(copperCanyon).filter((e) => e.url)).toHaveLength(1);
    expect(screen.getAllByLabelText('The record kept under this name')).toHaveLength(1);
  });

  it('prints nothing twice: the plain sections keep only what no name took', async () => {
    await show(copperCanyon);
    // Every staff entry went to a name, so there is no plain Staff section ...
    expect(staffRows(pageView(copperCanyon).staff)).toHaveLength(0);
    expect(screen.queryByLabelText(/^Staff, /)).toBeNull();
    // ... and each name's people appear once per name that lists them.
    const first = eras(copperCanyon)[0];
    for (const more of screen.getAllByLabelText(/^Show \d+ more$/)) await fireEvent.press(more);
    for (const n of names(first)) {
      const times = eras(copperCanyon).filter((e) => names(e).includes(n)).length;
      expect(screen.getAllByText(n)).toHaveLength(times);
    }
  });

  it("counts the whole page in the tiles (every name's section and the rest)", async () => {
    await show(canyonState);
    const totals = canyonState.eras!.totals!;
    const tiles = statTiles(canyonState);
    expect(tiles.find((t) => t.key === 'news')!.count).toBe(totals.news);
    expect(tiles.find((t) => t.key === 'memorials')!.count).toBe(totals.memorials);
    expect(screen.getByLabelText(`${totals.news} news articles`)).toBeTruthy();
    // The deaths sit under the name they happened under, and the plain section is gone.
    const boysRanch = eras(canyonState).find((e) => e.memorials.length)!;
    expect(boysRanch.name).toBe('Arizona Boys Ranch');
    for (const m of boysRanch.memorials) expect(screen.getByText(m.name)).toBeTruthy();
    expect(screen.queryByLabelText(/^Deaths on record, /)).toBeNull();
    expect(screen.getAllByText('Deaths on record').length).toBe(1); // the sub-head inside the name's section
  });

  it("lists the other name's news under that name", async () => {
    await show(rebekah);
    const later = eras(rebekah).find((e) => e.url && e.news.length)!;
    expect(later.name).toBe("New Beginnings Girls' Academy");
    for (const n of later.news) expect(screen.getAllByText(n.title).length).toBeGreaterThan(0);
  });

  it('says so when nothing is dated to a name yet', async () => {
    const f: FacilityPayload = JSON.parse(JSON.stringify(copperCanyon));
    f.eras!.list![1] = { ...f.eras!.list![1], staff: {} };
    await show(f);
    expect(screen.getByText('Nothing on record is dated to these years yet.')).toBeTruthy();
  });
});

describe('homes of one program', () => {
  it("a program's page lists its homes, five at first", async () => {
    await show(newport);
    const homes = newport.program_homes!.homes!;
    expect(screen.getByText(`A program of ${homes.length} licensed homes`)).toBeTruthy();
    expect(screen.getByLabelText(`Homes, ${homes.length}`)).toBeTruthy();
    for (const h of homes.slice(0, 5)) expect(screen.getAllByText(h.home_name || h.name).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(`Show ${homes.length - 5} more`)).toBeTruthy();
  });

  it("a home's page names its program and lists the other homes", async () => {
    await show(acre);
    const ho = acre.home_of!;
    expect(screen.getByText(`One of ${ho.count} homes of ${ho.program.name}`)).toBeTruthy();
    expect(screen.getByLabelText(`Other homes of ${ho.program.name}, ${ho.others!.length}`)).toBeTruthy();
    expect(screen.getByLabelText("The whole program, with every home's news, lawsuits and serious findings")).toBeTruthy();
    expect(screen.getByText(ho.others![0].name)).toBeTruthy();
  });
});

describe('incidents, forums and testimony', () => {
  it('draws the incident timeline with its count', async () => {
    await show(provo);
    expect(provo.incidents.length).toBeGreaterThan(5);
    expect(screen.getByLabelText(`Incidents on record, ${provo.incidents.length}`)).toBeTruthy();
    expect(screen.getByText(provo.incidents[0].text)).toBeTruthy();
  });

  it('keeps forum reports apart from the record, with the thread link', async () => {
    await show(provo);
    const forum = provo.forum!;
    expect(screen.getByLabelText('Reported on survivor forums')).toBeTruthy();
    expect(screen.getAllByText(startsWith(forum.incidents![0].text)).length).toBeGreaterThan(0);
    for (const l of forum.links!) expect(screen.getByLabelText(l.label)).toBeTruthy();
    // A forum post is never also an incident of the record.
    const record = new Set(provo.incidents.map((i) => i.text));
    expect(forum.incidents!.some((i) => record.has(i.text))).toBe(false);
  });

  it('lists the forum leads', async () => {
    await show(rebekah);
    expect(rebekah.forum!.leads!.length).toBeGreaterThan(0);
    // Printed as the website prints them, without the citation's address at the end.
    const lead = rebekah.forum!.leads![0];
    expect(lead).toMatch(/https:\/\//);
    const shown = screen.getByText(startsWith(lead));
    expect(shown.props.children).not.toMatch(/https?:\/\//);
  });

  it('never receives testimony a survivor has not agreed to publish', async () => {
    // Rebekah Home's record holds 24 forum accounts, none marked to publish: the server sends none.
    expect(rebekah.testimony).toEqual([]);
    await show(rebekah);
    expect(screen.queryByLabelText(/^Survivor testimony/)).toBeNull();
  });

  it('frames a published account with who shared it and when', async () => {
    await show({ ...rebekah, testimony: [{ text: 'They took our shoes so we could not run.', date_label: 'March 2024', submitted: true }] });
    expect(screen.getByText('They took our shoes so we could not run.')).toBeTruthy();
    expect(screen.getByText('Submitted by a survivor, shared March 2024')).toBeTruthy();
  });
});

describe('sources on the alias lines', () => {
  it('hangs the past names\' sources after the "Formerly" line', async () => {
    await show(acadia);
    expect(acadia.fact_sources.formerly).toHaveLength(1);
    const line = screen.getByText(startsWith(`Formerly ${acadia.formerly[0]}`));
    expect(within(line).getByLabelText(/^source: .*Acadia Montana/)).toBeTruthy();
  });

  it('cites the former locations in the at-a-glance box', async () => {
    await show(ascent);
    expect(screen.getByText('Former locations')).toBeTruthy();
    expect(screen.getByText(startsWith(`${ascent.former_locations[0].line} (${ascent.former_locations[0].years})`))).toBeTruthy();
    expect(screen.getAllByLabelText(/^source: r\/troubledteens wiki/).length).toBeGreaterThan(0);
  });
});

describe('materials and links: what the project holds, as on the website', () => {
  it('shows the held materials as one row of small ticked boxes, before the links (Claude note #18)', async () => {
    await show(provo);
    expect(provo.resources.length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Materials the project holds')).toBeTruthy();
    expect(screen.queryByText(/^Materials the project holds for this facility/)).toBeNull();
    for (const r of provo.resources) {
      expect(screen.getAllByText(r.label === 'Note' && r.detail ? r.detail : r.label).length).toBeGreaterThan(0);
    }
  });

  it('has the section and its jump pill even with no links at all', async () => {
    const heldOnly = { ...provo, profile_links: [], resource_links: [] };
    await show(heldOnly);
    expect(screen.getByLabelText('Jump to Materials and links')).toBeTruthy();
  });
});
