import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import type { NewsItem } from '@/api/types';
import {
  FeedCard,
  PersonCard,
  RecordNewsCard,
  SectionBlock,
  StatTiles,
  StatusPill,
  type StatTile,
} from '@/components/site';
import { colors, statusColor } from '@/theme/colors';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));

const facility = require('./fixtures/facility-9607.json');
const news = require('./fixtures/news.json');

const bobbie = facility.staff.notableStaff[0];

describe('PersonCard', () => {
  it('prints the name once and never the record sentence', async () => {
    await render(<PersonCard entry={bobbie} />);
    expect(screen.getAllByText(bobbie.name)).toHaveLength(1);
    expect(screen.queryByText(/Previously:/)).toBeNull();
    expect(screen.queryByText(/joined 2008/)).toBeNull();
  });

  it('shows the role line and a career block with every place up to four', async () => {
    await render(<PersonCard entry={bobbie} />);
    expect(screen.getByText('Admissions, Business Development and Marketing, 2009-2010')).toBeTruthy();
    expect(screen.getByText(/elsewhere in the industry/i)).toBeTruthy();
    for (const job of bobbie.career.slice(0, 4)) expect(screen.getByText(job.place)).toBeTruthy();
    expect(screen.queryByText(bobbie.career[5].place)).toBeNull();
    await fireEvent.press(screen.getByText('2 more +'));
    expect(screen.getByText(bobbie.career[5].place)).toBeTruthy();
    expect(screen.getByText('Show fewer −')).toBeTruthy();
  });

  it('puts noteworthy jobs outside the industry under their own heading, after the industry', async () => {
    const entry = {
      name: 'Pat Example',
      role: 'Director',
      career: [
        { place: 'Utah State Senate', role: 'Senator', kind: 'other' },
        { place: 'Sunrise Academy', role: 'Therapist', kind: 'industry' },
      ],
    };
    await render(<PersonCard entry={entry} />);
    expect(screen.getByText('Elsewhere in the industry')).toBeTruthy();
    expect(screen.getByText('Other notable positions')).toBeTruthy();
    const tree = JSON.stringify(screen.toJSON());
    expect(tree.indexOf('Sunrise Academy')).toBeLessThan(tree.indexOf('Other notable positions'));
    expect(tree.indexOf('Other notable positions')).toBeLessThan(tree.indexOf('Utah State Senate'));
  });

  it('shows one heading when every job is in the industry', async () => {
    await render(<PersonCard entry={bobbie} />);
    expect(screen.queryByText('Other notable positions')).toBeNull();
  });

  it('links the citation with its words as the label', async () => {
    await render(<PersonCard entry={bobbie} />);
    // Woodbury wording is dropped from the label, leaving "source"
    expect(screen.getByLabelText('source')).toBeTruthy();
  });

  it('has a teal left edge only when the person has career jobs', async () => {
    const { rerender } = await render(<PersonCard entry={bobbie} />);
    expect(StyleSheet.flatten(screen.getByTestId('person-card').props.style).borderLeftColor).toBe(colors.teal);
    await rerender(<PersonCard entry={facility.staff.administrator[0]} />);
    const flat = StyleSheet.flatten(screen.getByTestId('person-card').props.style);
    expect(flat.borderLeftColor).not.toBe(colors.teal);
    expect(flat.borderLeftWidth).toBeUndefined();
  });

  it('prints the cleaned sentence only when there is no name', async () => {
    await render(<PersonCard entry={{ text: 'Ran the camp (Woodbury Reports, May 2008, p. 4).' }} />);
    expect(screen.getByText('Ran the camp.')).toBeTruthy();
  });
});

describe('StatusPill', () => {
  it('uses the site colours for Open and Closed', async () => {
    const { rerender } = await render(<StatusPill status="Open" />);
    let style = StyleSheet.flatten(screen.getByTestId('status-pill').props.style);
    expect(style.backgroundColor).toBe(statusColor('Open').background);
    expect(style.borderColor).toBe(statusColor('Open').border);
    await rerender(<StatusPill status="Closed" />);
    style = StyleSheet.flatten(screen.getByTestId('status-pill').props.style);
    expect(style.backgroundColor).toBe(statusColor('Closed').background);
    expect(style.backgroundColor).not.toBe(statusColor('Open').background);
  });
  it('is empty without a status', async () => {
    await render(<StatusPill status="" />);
    expect(screen.queryByTestId('status-pill')).toBeNull();
  });
});

describe('StatTiles', () => {
  const tiles: StatTile[] = [
    { key: 'memorials', icon: 'candle', count: 2, singular: 'death on record', plural: 'deaths on record', tone: 'grave' },
    { key: 'lawsuits', icon: 'scale', count: 0, singular: 'lawsuit', plural: 'lawsuits', tone: 'warn' },
    { key: 'news', icon: 'newspaper', count: 1, singular: 'news article', plural: 'news articles', tone: 'info' },
  ];

  it('draws only tiles with something and jumps by key', async () => {
    const onJump = jest.fn();
    await render(<StatTiles tiles={tiles} onJump={onJump} />);
    expect(screen.queryByLabelText(/lawsuit/)).toBeNull();
    expect(screen.getByLabelText('1 news article')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('2 deaths on record'));
    expect(onJump).toHaveBeenCalledWith('memorials');
  });
});

describe('SectionBlock', () => {
  const items = Array.from({ length: 8 }, (_, i) => `Row ${i + 1}`);
  const section = (
    <SectionBlock id="news" title="News" icon="newspaper" items={items} renderItem={(t) => <Text>{t}</Text>} />
  );

  it('shows five, then the rest on "3 more +"', async () => {
    await render(section);
    expect(screen.getByText('Row 5')).toBeTruthy();
    expect(screen.queryByText('Row 6')).toBeNull();
    await fireEvent.press(screen.getByText('3 more +'));
    expect(screen.getByText('Row 8')).toBeTruthy();
    await fireEvent.press(screen.getByText('Show fewer −'));
    expect(screen.queryByText('Row 8')).toBeNull();
  });

  it('folds with its chevron and reports the state', async () => {
    await render(section);
    const head = screen.getByLabelText('News, 8');
    expect(head.props.accessibilityState.expanded).toBe(true);
    await fireEvent.press(head);
    expect(screen.queryByText('Row 1')).toBeNull();
    expect(screen.getByLabelText('News, 8').props.accessibilityState.expanded).toBe(false);
  });
});

describe('news cards', () => {
  const item: NewsItem = news.items.find((n: NewsItem) => !n.image);

  it('RecordNewsCard shows the outlet initial when there is no picture', async () => {
    await render(<RecordNewsCard item={item} />);
    expect(screen.getByText(item.outlet.charAt(0).toUpperCase())).toBeTruthy();
    expect(screen.getByText(item.title)).toBeTruthy();
  });

  it('FeedCard shows the type badge and the content note', async () => {
    await render(<FeedCard item={item} />);
    expect(screen.getByText(item.type)).toBeTruthy();
    expect(screen.getByText(`Content note: ${(item.content_warnings ?? []).join(', ')}`)).toBeTruthy();
  });

  it('FeedCard facility chips call back with the facility', async () => {
    const onFacility = jest.fn();
    const facilityRef = { id: 7, name: 'Hyde School', slug: 'hyde-school-ct', url: '/facility/hyde-school-ct/' };
    await render(<FeedCard item={{ ...item, facilities: [facilityRef] }} onFacility={onFacility} />);
    await fireEvent.press(screen.getByLabelText('Hyde School'));
    expect(onFacility).toHaveBeenCalledWith(facilityRef);
  });
});
