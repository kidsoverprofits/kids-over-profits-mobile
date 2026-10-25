import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import fs from 'node:fs';
import path from 'node:path';

import type { AppSuggestResponse, NewsFeed, OperatorsList } from '@/api/types';
import AboutScreen from '@/app/about';
import CompaniesScreen, { describe as describeCompany } from '@/app/(tabs)/companies';
import HomeScreen, { HOME_NEWS } from '@/app/(tabs)/index';
import NewsScreen from '@/app/(tabs)/news';
import PlacesScreen from '@/app/(tabs)/places';
import { rememberRecent, resetRecentForTests } from '@/lib/recent';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.2.3' } } }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('@/lib/credentials', () => ({ useCredentials: () => ({ creds: null, ready: true, reload: jest.fn() }) }));
jest.mock('@/api/queries', () => ({
  SUGGEST_MIN: 2,
  useAppSuggest: jest.fn(),
  useGlobalSearch: jest.fn(),
  useNews: jest.fn(),
  useOperators: jest.fn(),
}));

const queries = jest.requireMock('@/api/queries');
const news: NewsFeed = require('./fixtures/news.json');

/** kop/v1/operators, as scripts/test-mobile-api.php --dump writes it (also the screenshot fixture). */
function readOperators(): OperatorsList {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'scripts', 'shot-fixtures', 'operators.json'), 'utf8'));
}
const operators = readOperators();

const suggest: AppSuggestResponse = {
  query: 'falcon',
  items: [
    { kind: 'facility', id: 9607, name: 'Falcon Ridge Ranch', place: 'Virgin, Utah', status: 'Open', hint: '', slug: 'falcon-ridge-ranch-ut', url: 'https://kidsoverprofits.org/facility/falcon-ridge-ranch-ut/' },
    { kind: 'facility', id: 8234, name: 'Falcon Ridge Academy', place: 'Escalante, Utah', status: 'Closed', hint: 'Formerly Falcon Ridge Ranch (1998–2020)', slug: 'falcon-ridge-academy-ut', url: 'https://kidsoverprofits.org/facility/falcon-ridge-academy-ut/' },
    { kind: 'operator', id: 77, name: 'Falcon Holdings', place: '2 programs', status: '', hint: 'Formerly Falcon Group', slug: 'falcon-holdings', url: 'https://kidsoverprofits.org/operator/falcon-holdings/' },
  ],
};

beforeEach(async () => {
  mockPush.mockClear();
  await AsyncStorage.clear();
  resetRecentForTests();
  queries.useAppSuggest.mockReturnValue({ data: suggest, isLoading: false, isError: false });
  queries.useGlobalSearch.mockReturnValue({ data: undefined, isLoading: false, isError: false });
  queries.useNews.mockReturnValue({
    data: { pages: [news] },
    isLoading: false,
    isError: false,
    isRefetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
  });
  queries.useOperators.mockReturnValue({ data: operators, isLoading: false, isError: false, refetch: jest.fn() });
});

describe('Home tab', () => {
  it('opens on search, the ways in, the newest news and the help box', async () => {
    await render(<HomeScreen />);
    expect(screen.getByText('Find a program')).toBeTruthy();
    expect(screen.queryByText('Type at least two letters to search.')).toBeNull();
    for (const label of ['Network map', 'Companies', 'States', 'News', 'Send a tip', 'About', 'Volunteers']) expect(screen.getByText(label)).toBeTruthy();
    for (const item of news.items.slice(0, HOME_NEWS)) expect(screen.getByText(item.title)).toBeTruthy();
    expect(screen.queryByText(news.items[HOME_NEWS].title)).toBeNull();
    expect(screen.getByText('Need help now?')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Network map. Who ran what, and who owns it'));
    expect(mockPush).toHaveBeenCalledWith('/map');
    await fireEvent.press(screen.getByLabelText('Resources'));
    expect(mockPush).toHaveBeenCalledWith('/resources');
  });

  it('lists what this reader opened last, kept on the phone, and clears it', async () => {
    await rememberRecent({ kind: 'facility', slug: 'falcon-ridge-ranch-ut', name: 'Falcon Ridge Ranch', place: 'Virgin, Utah' });
    await rememberRecent({ kind: 'operator', slug: 'uhs', name: 'Universal Health Services', place: 'Company, 40 programs' });
    await render(<HomeScreen />);
    expect(await screen.findByText('You looked at recently')).toBeTruthy();
    const rows = screen.getAllByText(/^(Universal Health Services|Falcon Ridge Ranch)$/).map((n) => n.props.children);
    expect(rows).toEqual(['Universal Health Services', 'Falcon Ridge Ranch']);
    await fireEvent.press(screen.getByLabelText('Falcon Ridge Ranch. Virgin, Utah'));
    expect(mockPush).toHaveBeenCalledWith('/facility/falcon-ridge-ranch-ut');
    await fireEvent.press(screen.getByLabelText('Clear this list'));
    expect(screen.queryByText('You looked at recently')).toBeNull();
  });

  it('asks for two letters, then suggests programs and companies with their former-name hint', async () => {
    await render(<HomeScreen />);
    await fireEvent.changeText(screen.getByLabelText('Search programs and companies by name, including former names'), 'f');
    expect(await screen.findByText('Type at least two letters to search.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Search programs and companies by name, including former names'), 'falcon');
    expect(await screen.findByText('Falcon Ridge Academy')).toBeTruthy();
    expect(screen.getByText('Falcon Ridge Ranch')).toBeTruthy();
    expect(screen.getByText('Formerly Falcon Ridge Ranch (1998–2020)')).toBeTruthy();
    expect(screen.getByText('Escalante, Utah · Closed')).toBeTruthy();
    expect(screen.getAllByText('Facility')).toHaveLength(2);
    expect(screen.getByText('Company')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(/^Facility\. Falcon Ridge Academy\. Formerly/));
    expect(mockPush).toHaveBeenCalledWith('/facility/falcon-ridge-academy-ut');
    await fireEvent.press(screen.getByLabelText(/^Company\. Falcon Holdings\. Formerly Falcon Group/));
    expect(mockPush).toHaveBeenCalledWith('/operator/falcon-holdings');
  });

  it('offers the site-wide search once there is a query', async () => {
    await render(<HomeScreen />);
    await fireEvent.changeText(screen.getByLabelText('Search programs and companies by name, including former names'), 'falcon');
    await fireEvent.press(await screen.findByText('Search news, lawsuits and records too'));
    expect(queries.useGlobalSearch).toHaveBeenLastCalledWith('falcon', true);
  });
});

describe('News tab', () => {
  it('shows an ongoing story card and a feed title', async () => {
    await render(<NewsScreen />);
    expect(screen.getByText('All news')).toBeTruthy();
    expect(screen.getByText(news.arcs[0].title)).toBeTruthy();
    expect(screen.getByText(news.items[0].title)).toBeTruthy();
    expect(screen.getByText(`${news.total} articles`)).toBeTruthy();
  });

  it('filters by story when its card is pressed', async () => {
    await render(<NewsScreen />);
    await fireEvent.press(screen.getByLabelText(new RegExp(`^Ongoing story: ${news.arcs[0].title}\\.`)));
    expect(queries.useNews).toHaveBeenLastCalledWith({ story: news.arcs[0].slug, archive: undefined });
  });
});

describe('Places tab', () => {
  it('lists states and countries and opens a place', async () => {
    await render(<PlacesScreen />);
    expect(screen.getByText('States and countries')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Utah. UT'));
    expect(mockPush).toHaveBeenCalledWith('/place/utah?kind=state');
    expect(screen.getByText('Costa Rica')).toBeTruthy();
  });
});

describe('Companies tab', () => {
  const companies = [...operators.items].sort((a, b) => a.name.localeCompare(b.name));

  it('draws a tile for each company with its program count', async () => {
    await render(<CompaniesScreen />);
    expect(screen.getByText('Parent companies')).toBeTruthy();
    expect(screen.getByText(`${companies.length} companies`)).toBeTruthy();
    // The list draws its first screens at once and the rest on scroll.
    for (const c of companies.slice(0, 8)) {
      expect(screen.getByText(c.name)).toBeTruthy();
      expect(screen.getAllByText(`${c.programs} ${c.programs === 1 ? 'program' : 'programs'}`).length).toBeGreaterThan(0);
    }
  });

  it('has an alphabet row with a button for the first letter of each company', async () => {
    await render(<CompaniesScreen />);
    for (const c of companies) {
      const first = c.name.charAt(0).toUpperCase();
      expect(screen.getByLabelText(`Jump to ${first >= 'A' && first <= 'Z' ? first : '#'}`)).toBeTruthy();
    }
  });

  it('opens a company by its page slug', async () => {
    await render(<CompaniesScreen />);
    const c = companies[0];
    await fireEvent.press(screen.getByLabelText(`${c.name}. ${describeCompany(c)}. ${c.programs} ${c.programs === 1 ? 'program' : 'programs'}`));
    expect(mockPush).toHaveBeenCalledWith(`/operator/${c.slug}`);
  });

  it('adds companies found by another name, and opens one', async () => {
    const other = suggest.items.filter((i) => i.kind === 'operator');
    queries.useAppSuggest.mockReturnValue({ data: { query: 'falcon', items: other }, isLoading: false, isError: false });
    await render(<CompaniesScreen />);
    expect(screen.queryByText('Also matching, by another name')).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Filter the list of companies, including former names'), 'falcon');
    expect(await screen.findByText('Also matching, by another name')).toBeTruthy();
    expect(queries.useAppSuggest).toHaveBeenCalledWith(expect.any(String), ['operator'], 6);
    await fireEvent.press(screen.getByLabelText(/^Company\. Falcon Holdings\./));
    expect(mockPush).toHaveBeenCalledWith('/operator/falcon-holdings');
  });

  it('says where the programs are, in words', () => {
    expect(describeCompany({ places: ['UT', 'AZ'], years: '' })).toBe('Utah, Arizona');
    expect(describeCompany({ places: ['UT', 'AZ', 'ID'], years: '' })).toBe('3 states');
    expect(describeCompany({ places: ['UT', 'Costa Rica', 'ID'], years: '' })).toBe('3 places');
    expect(describeCompany({ places: ['Samoa'], years: '' })).toBe('Samoa');
    expect(describeCompany({ places: [], years: 'Founded 2005' })).toBe('Founded 2005');
  });
});

describe('About tab', () => {
  it('shows the reporting box and the sharing section', async () => {
    await render(<AboutScreen />);
    expect(screen.getByText('Report abuse')).toBeTruthy();
    expect(screen.getByText('Share information')).toBeTruthy();
    expect(screen.getByLabelText('Find where to report')).toBeTruthy();
    expect(screen.getByText('Version 1.2.3')).toBeTruthy();
  });
});
