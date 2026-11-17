/**
 * Articles that name a program only in passing (theme inc/news-passing.php, plan 4.3 item 31): the facility and
 * company news sections list them apart, folded, before the celebrity and viral stories, as the website does, and
 * the facility's news tile does not count them.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { FacilityPayload, NewsItem, OperatorPayload } from '@/api/types';
import { NewsSection } from '@/components/facility/RecordSections';
import { statTiles } from '@/components/facility/model';
import { NewsSection as OperatorNewsSection } from '@/components/operator/Records';
import { passingLabel, splitNews } from '@/components/site';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({ slug: 'x' })),
  useRouter: () => ({ push: jest.fn() }),
  Stack: { Screen: () => null },
}));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));

const base: FacilityPayload = require('./fixtures/facility-10371.json');
const item = (id: number, title: string, extra: Partial<NewsItem> = {}): NewsItem => ({
  ...base.news[0],
  id,
  title,
  image: null as unknown as NewsItem['image'],
  aside: false,
  ...extra,
});
const news = [
  item(1, 'About the program'),
  item(2, 'Names it once', { passing: true }),
  item(3, 'A celebrity story', { aside: true }),
  item(4, 'Another passing mention', { passing: true }),
];

test('splitNews puts each article in one list', () => {
  const { main, passing, aside } = splitNews(news);
  expect(main.map((n) => n.id)).toEqual([1]);
  expect(passing.map((n) => n.id)).toEqual([2, 4]);
  expect(aside.map((n) => n.id)).toEqual([3]);
  expect(passingLabel(1)).toBe('1 article that mentions it in passing');
  expect(passingLabel(2, 'its programs')).toBe('2 articles that mention its programs in passing');
});

test('the facility section folds passing mentions apart', async () => {
  await render(<NewsSection f={{ ...base, news }} onLayoutY={() => {}} />);
  expect(screen.getByText('About the program')).toBeTruthy();
  expect(screen.queryByText('Names it once')).toBeNull();
  const fold = screen.getByLabelText('2 articles that mention it in passing');
  expect(screen.getByLabelText('1 article about celebrities and viral stories')).toBeTruthy();
  await act(async () => { fireEvent.press(fold); });
  expect(screen.getByText('Names it once')).toBeTruthy();
  expect(screen.getByText('Another passing mention')).toBeTruthy();
  expect(screen.queryByText('A celebrity story')).toBeNull();
});

test('the news tile leaves passing mentions out', () => {
  const tile = statTiles({ ...base, news, eras: null }).find((t) => t.key === 'news');
  expect(tile?.count).toBe(2);
});

test('the company section says its programs', async () => {
  const o = { news } as unknown as OperatorPayload;
  await render(<OperatorNewsSection o={o} />);
  expect(screen.getByLabelText('2 articles that mention its programs in passing')).toBeTruthy();
});
