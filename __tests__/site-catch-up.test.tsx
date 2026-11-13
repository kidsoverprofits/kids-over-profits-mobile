/**
 * The website sections the app caught up on in November 2026: a record's About (its notes as cited prose, or its
 * published write-up), survivor quotes with their credit and note, readers' answers from the questions page, the
 * handbook rules, the page timeline, federal funding, the Form 990s and state business filings, the same-campus
 * programs and a program's history; on a company page its About, filings and states counted apart from countries;
 * the search previews; and every read going to the live site, not the phone's HTTP cache.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { fetchJson } from '@/api/client';
import { useOperator, useOperatorByName } from '@/api/queries';
import type { FacilityPayload, OperatorPayload } from '@/api/types';
import FacilityScreen from '@/app/facility/[slug]';
import OperatorScreen from '@/app/operator/[slug]';
import { presentSections } from '@/components/facility/model';
import { glanceRows } from '@/components/operator/model';
import { money } from '@/components/record/Filings';
import { timelineItems } from '@/components/record/PageTimeline';
import { previewLines } from '@/components/Suggestions';
import { useRefreshControl } from '@/lib/refresh';

const mockFacility: { current: FacilityPayload | undefined } = { current: undefined };

jest.mock('@/api/queries', () => ({
  useFacility: () => ({ data: mockFacility.current, isLoading: false, isError: false, refetch: jest.fn(() => Promise.resolve()) }),
  useOperator: jest.fn(),
  useOperatorByName: jest.fn(),
}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({ slug: 'x' })),
  useRouter: () => ({ push: jest.fn() }),
  Stack: { Screen: () => null },
}));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));

const base: FacilityPayload = require('./fixtures/facility-10371.json');
const heading = (title: string) => screen.queryByLabelText(new RegExp(`^${title}(,|$)`));

const facility: FacilityPayload = {
  ...base,
  formerly: ['Old Name Academy'],
  formerly_years: { 'Old Name Academy': '1990-1999' },
  later: ['New Name Academy'],
  about: {
    writeup: true,
    paragraphs: [
      [
        { text: 'The school opened in 1971 as a program for boys.', sources: [{ url: 'https://example.org/a', cite: 'Example Times, 1971' }] },
        { text: 'A judge barred its polygraphs in 1980.', sources: [{ url: '', cite: 'Milonas v. Williams (print)' }] },
      ],
    ],
    also: [{ url: 'https://example.org/also', label: 'An outside report' }],
  },
  field_notes: [{ label: 'Visited', text: 'A field note.' }],
  notes: ['A research note that the About already says.'],
  testimony: [
    { text: 'They held me down for hours.', credit: 'Former student, Unsilenced, 2010', url: 'https://example.org/t', note: 'Names a staff member.' },
  ],
  readers: [{ text: 'We could not write home.', credit: 'A former student, from our questions page', staff: ['Jane Roe'] }],
  reader_rules: [{ text: 'No talking for the first week.', credit: 'A former student, from our questions page', staff: [] }],
  questions_url: 'https://kidsoverprofits.org/questions/',
  rules: [
    {
      topic: 'contact',
      label: 'Contact with family',
      lines: [{ text: 'Phone calls only after level two.', source_url: 'https://example.org/handbook.pdf#page=4', source_title: 'Parent handbook', page: 4, year: 1996 }],
    },
  ],
  timeline: [
    {
      year: 1971,
      events: [
        { kind: 'opened', label: 'Opened', group: 'programs', when: '', title: 'Opened in Provo', lead: '', items: [], detail: [], sources: [], major: true },
      ],
    },
    {
      year: 2026,
      events: [
        {
          kind: 'closed', label: 'Closed', group: 'programs', when: 'July 2026', title: 'Licence revoked', lead: 'The state ordered it shut',
          items: [], detail: [], sources: [{ url: 'https://example.org/k', cite: 'KUER' }], major: true,
        },
      ],
    },
  ],
  federal_funding: [
    { stream: 'medicaid', label: 'Medicaid', entries: [{ detail: 'It took Montana Medicaid children.', years: '2022', sources: [{ url: 'https://example.org/m', label: 'KFF' }] }] },
  ],
  nonprofits: [
    {
      name: 'Example Youth Services Inc', ein_label: '12-3456789', place: 'Provo, UT', kind: 'Charitable organization', since: '1995',
      url: 'https://projects.propublica.org/x', years: '2019 to 2021',
      filings: [{ year: 2021, form: '990', revenue: 12345678, expenses: 1000, officer_pay: null, assets: -5, pdf: 'https://example.org/990.pdf' }],
    },
  ],
  businesses: [
    {
      name: 'Example Holdings LLC', state: 'Utah', summary: 'Limited liability company, document 123, filed March 15, 2004, active.', url: 'https://example.org/biz',
      address: '1 Main St, Provo, UT', officers: [{ name: 'John Doe', title: 'Manager', where: 'Provo, UT' }], more_officers: true,
      agent: { name: 'Agent Co', where: 'Salt Lake City' }, events: [{ date: 'March 15, 2004', what: 'Articles of organization', name: '', notes: '', url: '' }],
      trade_names: [{ name: 'Example Ranch', note: 'registered June 2005, active' }],
    },
  ],
  campus: { name: 'the Example campus', others: [{ name: 'Example Day School', url: 'https://kidsoverprofits.org/facility/x/', place: 'Provo, UT', status: 'Closed', role: '' }] },
  history: { status: 'published', paragraphs: ['A company history paragraph.'], sources: [{ label: 'A book', url: 'https://example.org/b' }] },
};

const show = async (f: FacilityPayload) => {
  mockFacility.current = f;
  await render(<FacilityScreen />);
};

describe('facility page: the sections the website added', () => {
  it("prints the About's sentences with their sources and the Also drawn on links, and folds the notes into it", async () => {
    await show(facility);
    expect(heading(`About ${facility.name}`)).toBeTruthy();
    expect(screen.getByText(/The school opened in 1971 as a program for boys\./)).toBeTruthy();
    expect(screen.getByText(/A judge barred its polygraphs in 1980\./)).toBeTruthy();
    expect(screen.getByText('An outside report')).toBeTruthy();
    expect(screen.getByText(/A field note\./)).toBeTruthy();
    // The notes are the About's prose on the website: no separate list beside it.
    expect(heading('Research notes')).toBeNull();
    expect(screen.queryByText('A research note that the About already says.')).toBeNull();
  });

  it('keeps the notes as a list for a record with no About', async () => {
    await show({ ...facility, about: { paragraphs: [] }, field_notes: [] });
    expect(heading('Research notes')).toBeTruthy();
    expect(screen.getByText('A research note that the About already says.')).toBeTruthy();
  });

  it("credits each survivor quote, links the original and adds a reader's staff note", async () => {
    await show(facility);
    expect(screen.getByText('They held me down for hours.')).toBeTruthy();
    expect(screen.getByText('Former student, Unsilenced, 2010')).toBeTruthy();
    expect(screen.getByText('Names a staff member.')).toBeTruthy();
    expect(screen.getByText('We could not write home.')).toBeTruthy();
    expect(screen.getByText(/Names staff: Jane Roe\. What it says about them is this reader's allegation/)).toBeTruthy();
    expect(screen.getAllByText('questions page').length).toBeGreaterThan(0);
  });

  it('heads Rules and practices with the handbook lines and the rules readers remember', async () => {
    await show(facility);
    expect(heading('Rules and practices')).toBeTruthy();
    expect(screen.getByText('Contact with family')).toBeTruthy();
    expect(screen.getByText(/Phone calls only after level two\./)).toBeTruthy();
    expect(screen.getByText('What people who were there remember')).toBeTruthy();
    expect(screen.getByText('No talking for the first week.')).toBeTruthy();
  });

  it('draws the timeline, federal funding, the filings, the same campus and the history', async () => {
    await show(facility);
    for (const t of ['Timeline', 'Federal funding', 'Nonprofit tax filings', 'Business filings', 'Other programs on the Example campus', 'History']) {
      expect(heading(t)).toBeTruthy();
    }
    expect(screen.getByText(/Licence revoked\. The state ordered it shut\./)).toBeTruthy();
    expect(screen.getByText(/It took Montana Medicaid children\./)).toBeTruthy();
    expect(screen.getByText('Example Youth Services Inc')).toBeTruthy();
    expect(screen.getByText(/\$12,345,678/)).toBeTruthy();
    expect(screen.getByText('Example Holdings LLC')).toBeTruthy();
    expect(screen.getByText(/More officers are listed/)).toBeTruthy();
    expect(screen.getByText('Example Day School')).toBeTruthy();
    expect(screen.getByText('A company history paragraph.')).toBeTruthy();
  });

  it("puts the past name's years and the later name in the header", async () => {
    await show(facility);
    expect(screen.getByText(/Formerly Old Name Academy \(1990-1999\)/)).toBeTruthy();
    expect(screen.getByText('Later called New Name Academy')).toBeTruthy();
  });

  it("lists the jump pills in the website's order", () => {
    const ids = presentSections(facility).map((s) => s.id);
    const order = ['history', 'campus', 'about', 'testimony', 'timeline', 'lawsuits', 'funding', 'tax-filings', 'business-filings', 'practices'];
    const at = order.map((id) => ids.indexOf(id));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('reads an older payload without the new fields', async () => {
    await show(base);
    expect(screen.getAllByText(base.name).length).toBeGreaterThan(0);
  });
});

describe('the pieces behind them', () => {
  it('words a 990 amount as the website does', () => {
    expect(money(1234567)).toBe('$1,234,567');
    expect(money(-5)).toBe('-$5');
    expect(money(null)).toBe('');
  });

  it("makes one timeline row per event, with the event's date or its year", () => {
    const rows = timelineItems(facility.timeline);
    expect(rows.map((r) => r.when)).toEqual([1971, 'July 2026']);
    expect(rows[0].kind).toBe('Opened');
  });

  it('shows at most four other names and three places, then "and N more"', () => {
    expect(previewLines({ names: ['A', 'B', 'C', 'D', 'E'], places: ['X'] })).toEqual(['A; B; C; D; and 1 more', 'X']);
    expect(previewLines({})).toEqual([]);
  });
});

describe('company page', () => {
  const operator: OperatorPayload = require('./fixtures/operator-1.json');
  const withAbout: OperatorPayload = {
    ...operator,
    state_count: 3,
    country_count: 1,
    about: { paragraphs: [[{ text: 'The company was founded in 1967.', sources: [{ url: 'https://example.org/c', cite: 'A newspaper' }] }]] },
    nonprofits: facility.nonprofits,
    businesses: facility.businesses,
  };
  const ok = (data: unknown) => ({ data, isLoading: false, isError: false, error: null, refetch: jest.fn(() => Promise.resolve()) });

  it('prints its About, its filings, and states apart from countries', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ slug: '1' });
    (useOperator as jest.Mock).mockReturnValue(ok(withAbout));
    (useOperatorByName as jest.Mock).mockReturnValue(ok(undefined));
    await render(<OperatorScreen />);
    expect(heading(`About ${operator.name}`)).toBeTruthy();
    expect(screen.getByText(/The company was founded in 1967\./)).toBeTruthy();
    expect(heading('Nonprofit tax filings')).toBeTruthy();
    expect(heading('Business filings')).toBeTruthy();
    const rows = glanceRows(withAbout).map((r) => `${r.label}: ${r.value}`);
    expect(rows).toEqual(expect.arrayContaining(['States: 3', 'Country outside the US: 1']));
    expect(rows.some((r) => r.startsWith('States and countries'))).toBe(false);
    fireEvent.press(screen.getAllByLabelText(/^Jump to About/)[0]);
  });
});

describe('the rest of the website: profile posts, documents others hold, further research', () => {
  const withProfile: FacilityPayload = {
    ...base,
    outside_research: [{ name: 'Teen Challenge Research Map', url: 'https://example.org/map/x', by: 'A researcher', note: 'Every program on one map.' }],
    research: [{ title: 'A 2004 report', url: 'https://example.org/r.pdf', byline: 'ISAC', why: 'Lists the program', pages: 'page 12', library: 'https://kidsoverprofits.org/research/' }],
    archives: [
      {
        label: 'Unsilenced', url: 'https://www.unsilenced.org/program-archive/', intro: '2 documents about X that Unsilenced collected.',
        folders: [{ name: 'X folder', url: 'https://drive.example/f' }],
        groups: [{ name: '', files: [{ title: 'Intake form', url: 'https://drive.example/1', note: 'Program paper · scan.pdf' }] }],
      },
    ],
    profile: {
      url: 'https://kidsoverprofits.org/elan/', title: 'Elan School', merged: false, updated: 'Last updated: May 2025',
      lead: ['Elan opened in 1970. See [the Times](https://example.org/t).'],
      facts: [{ label: 'Founded', lines: ['1970'] }],
      sections: [
        { id: 'abuse', title: 'Abuse at Elan', kind: 'prose', paragraphs: ['• The ring\n• The boards'], links: [] },
        { id: 'news', title: 'News', kind: 'news', paragraphs: [], links: [{ title: 'A 1990 story', url: 'https://example.org/n', summary: '', outlet: 'example.org' }] },
      ],
    },
  };

  it("shows a hand-written profile post's opening, facts and written sections, and the post's news after the record's", async () => {
    await show(withProfile);
    expect(heading('Elan School')).toBeTruthy();
    expect(screen.getByText(/Elan opened in 1970\./)).toBeTruthy();
    expect(screen.getByText('the Times')).toBeTruthy();
    expect(screen.getByText('Founded')).toBeTruthy();
    expect(heading('Abuse at Elan')).toBeTruthy();
    expect(screen.getByText(/The ring/)).toBeTruthy();
    expect(screen.queryByLabelText('News (from our profile)')).toBeTruthy();
    expect(screen.getByText('A 1990 story')).toBeTruthy();
    expect(presentSections(withProfile).map((s) => s.id)).toContain('profile');
  });

  it('lists research naming the program and the files Unsilenced holds under Documents, and the further research box', async () => {
    await show(withProfile);
    expect(heading('Documents')).toBeTruthy();
    expect(screen.getByText('Research that mentions this program')).toBeTruthy();
    expect(screen.getByText('A 2004 report')).toBeTruthy();
    expect(screen.getByText('From Unsilenced')).toBeTruthy();
    expect(screen.getByText('Intake form')).toBeTruthy();
    expect(screen.getByText('X folder')).toBeTruthy();
    expect(screen.getByText('Teen Challenge Research Map')).toBeTruthy();
    expect(screen.getByText('Every program on one map.')).toBeTruthy();
  });

  it("gives a company page its related programs, materials and further research", async () => {
    const operator: OperatorPayload = require('./fixtures/operator-1.json');
    const o: OperatorPayload = {
      ...operator,
      related: [{ id: 1, name: 'A Camp', url: 'https://kidsoverprofits.org/facility/a-camp/', label: 'Summer camps', place: 'Utah', status: 'Closed', past: true }],
      resource_links: [{ kind: 'archive', label: 'Archived pages', links: [{ label: 'Old site', url: 'https://web.archive.org/x', live_url: 'https://x.org', go_url: 'https://x.org' }] }],
      outside_research: [{ name: 'A research map', url: 'https://example.org/m', by: 'Someone', note: '' }],
    };
    (useLocalSearchParams as jest.Mock).mockReturnValue({ slug: '1' });
    (useOperator as jest.Mock).mockReturnValue({ data: o, isLoading: false, isError: false, error: null, refetch: jest.fn(() => Promise.resolve()) });
    (useOperatorByName as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() });
    await render(<OperatorScreen />);
    expect(heading('Related programs')).toBeTruthy();
    expect(screen.getByText('A Camp')).toBeTruthy();
    expect(screen.getByText('Summer camps | Utah | Closed | Ran it in the past')).toBeTruthy();
    expect(heading('Materials and links')).toBeTruthy();
    expect(screen.getByText('Old site')).toBeTruthy();
    expect(screen.getByText('Old site: the live site')).toBeTruthy();
    expect(screen.getByText('A research map')).toBeTruthy();
  });
});

describe('live reads', () => {
  it('reads the screen again when it is pulled down, and stops spinning when the site answers', async () => {
    const refetch = jest.fn(() => Promise.resolve());
    const out: { el?: ReactElement<{ refreshing: boolean; onRefresh: () => void }> } = {};
    function Probe() {
      out.el = useRefreshControl(refetch) as ReactElement<{ refreshing: boolean; onRefresh: () => void }>;
      return null;
    }
    await render(<Probe />);
    expect(out.el?.props.refreshing).toBe(false);
    await act(async () => {
      out.el?.props.onRefresh();
    });
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(out.el?.props.refreshing).toBe(false);
  });

  it("asks for every page with cache 'no-store', so a refresh reaches the site, not the phone's HTTP cache", async () => {
    const fetchMock = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: 1 }) }));
    const real = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;
    try {
      await fetchJson('facility/x');
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/wp-json/kop/v1/facility/x'), expect.objectContaining({ cache: 'no-store' }));
    } finally {
      global.fetch = real;
    }
  });
});
