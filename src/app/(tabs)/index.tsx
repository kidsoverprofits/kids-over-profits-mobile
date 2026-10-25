import { useRouter, type Href } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SITE } from '@/api/client';
import { SUGGEST_MIN, useAppSuggest, useGlobalSearch, useNews } from '@/api/queries';
import { DonateBox } from '@/components/Donate';
import { Shortcuts, type Shortcut } from '@/components/home/Shortcuts';
import type { IconName } from '@/components/Icon';
import { Button, HubBox, HubHeader, HubListRow, SectionBlock } from '@/components/site';
import { SuggestionList, suggestionHref } from '@/components/Suggestions';
import { Note } from '@/components/tabs/Note';
import { SearchField } from '@/components/tabs/SearchField';
import { TabPage } from '@/components/tabs/TabPage';
import { useDebounced } from '@/components/tabs/useDebounced';
import { ErrorState, Loading } from '@/components/ui';
import { useCredentials } from '@/lib/credentials';
import { openLink } from '@/lib/links';
import { clearRecent, useRecent } from '@/lib/recent';
import { spacing, type } from '@/theme/typography';

/** The icon of each site-wide result group; anything else gets a document. */
const GROUP_ICONS: Record<string, IconName> = {
  facilities: 'building',
  news: 'newspaper',
  lawsuits: 'scale',
  wiki: 'book',
  documents: 'file-text',
  places: 'map-pin',
};

/** Articles the home screen shows before "All news". */
export const HOME_NEWS = 3;

/** What the app opens on: search, then the ways in, the newest news and what this reader opened last. */
function HomeContent() {
  const router = useRouter();
  const go = (href: string) => router.push(href as Href);
  const news = useNews();
  const recent = useRecent();
  const { creds } = useCredentials();
  const latest = (news.data?.pages[0]?.items ?? []).slice(0, HOME_NEWS);

  const shortcuts: Shortcut[] = [
    { key: 'map', label: 'Network map', meta: 'Who ran what, and who owns it', icon: 'shuffle', onPress: () => go('/map') },
    { key: 'companies', label: 'Companies', meta: 'Parent companies and their programs', icon: 'building', onPress: () => go('/companies') },
    { key: 'places', label: 'States', meta: 'Programs and reports by state', icon: 'map-pin', onPress: () => go('/places') },
    { key: 'news', label: 'News', meta: 'Articles and ongoing stories', icon: 'newspaper', onPress: () => go('/news') },
    { key: 'send', label: 'Send a tip', meta: 'An article, lawsuit or correction', icon: 'send', onPress: () => go('/send') },
    { key: 'about', label: 'About', meta: 'Who we are, how the data works', icon: 'info', onPress: () => go('/about') },
    {
      key: 'volunteer',
      label: 'Volunteers',
      meta: creds ? `Signed in as ${creds.username}` : 'Sign in to send straight to review',
      icon: 'key',
      onPress: () => go('/reviewer'),
    },
  ];

  return (
    <View style={styles.home}>
      <Shortcuts items={shortcuts} />

      <SectionBlock id="news" title="Latest news" icon="newspaper">
        {news.isLoading ? (
          <Loading label="Loading the news" />
        ) : news.isError ? (
          <ErrorState message={(news.error as Error).message} onRetry={() => news.refetch()} />
        ) : (
          <View style={styles.list}>
            {latest.map((item) => (
              <HubListRow
                key={item.id}
                title={item.title}
                meta={[item.outlet, item.date_label].filter(Boolean).join(' · ')}
                onPress={() => void openLink(item.url, (href) => router.push(href))}
              />
            ))}
            <Button variant="secondary" label="All news" icon="newspaper" onPress={() => go('/news')} />
          </View>
        )}
      </SectionBlock>

      {recent.length ? (
        <SectionBlock id="recent" title="You looked at recently" icon="eye">
          <View style={styles.list}>
            {recent.map((r) => (
              <HubListRow key={`${r.kind}-${r.slug}`} title={r.name} meta={r.place} onPress={() => go(`/${r.kind}/${r.slug}`)} />
            ))}
            <Text style={styles.private}>Kept on this phone only.</Text>
            <Button variant="secondary" label="Clear this list" icon="x" onPress={() => void clearRecent()} />
          </View>
        </SectionBlock>
      ) : null}

      <HubBox title="Need help now?" tone="orange">
        <Text style={type.body}>Crisis lines, where to report abuse in a program, and survivor support.</Text>
        <Button label="Resources" icon="lifebuoy" onPress={() => go('/resources')} />
      </HubBox>

      <DonateBox />
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [more, setMore] = useState(false);
  const q = useDebounced(text, 250);
  const suggest = useAppSuggest(q);
  const global = useGlobalSearch(q, more);
  const short = q.trim().length < SUGGEST_MIN;
  const items = suggest.data?.items ?? [];
  const go = (url: string) => openLink(url, (href) => router.push(href));

  return (
    <TabPage>
      <HubHeader
        eyebrow="Kids Over Profits"
        title="Find a program"
        standfirst="Search programs and companies by name, including former and other names."
      />
      <SearchField
        value={text}
        onChangeText={(t) => {
          setText(t);
          setMore(false);
        }}
        placeholder="A program, a company, or an old name"
        label="Search programs and companies by name, including former names"
      />

      {short ? (
        <>
          {text.trim() ? <Note>Type at least two letters to search.</Note> : null}
          <HomeContent />
        </>
      ) : suggest.isLoading ? (
        <Loading label="Searching" />
      ) : suggest.isError ? (
        <ErrorState message={(suggest.error as Error).message} onRetry={() => suggest.refetch()} />
      ) : items.length === 0 ? (
        <Note>{`No program or company matches "${q.trim()}".`}</Note>
      ) : (
        <View style={styles.results}>
          <SuggestionList
            items={items}
            onPick={(item) => {
              const href = suggestionHref(item);
              if (href) router.push(href);
              else if (item.url) void go(item.url);
              else void openBrowserAsync(`${SITE}/?s=${encodeURIComponent(item.name)}`);
            }}
          />
        </View>
      )}

      {q.trim().length >= 3 && !suggest.isLoading ? (
        <View style={styles.more}>
          {!more ? (
            <Button variant="secondary" label="Search news, lawsuits and records too" icon="search" onPress={() => setMore(true)} />
          ) : global.isLoading ? (
            <Loading label="Searching the whole site" />
          ) : global.isError ? (
            <ErrorState message={(global.error as Error).message} onRetry={() => global.refetch()} />
          ) : (global.data?.groups ?? []).length === 0 ? (
            <Note>Nothing else on the site matches.</Note>
          ) : (
            (global.data?.groups ?? []).map((g) => (
              <SectionBlock
                key={g.key}
                id={g.key}
                title={g.label}
                icon={GROUP_ICONS[g.key] ?? 'file-text'}
                items={g.items}
                renderItem={(it) => <HubListRow title={it.title} meta={it.meta} onPress={() => go(it.url)} />}
              />
            ))
          )}
        </View>
      ) : null}
    </TabPage>
  );
}

const styles = StyleSheet.create({
  home: { gap: spacing.lg, marginTop: spacing.md },
  list: { gap: spacing.sm },
  private: { ...type.meta },
  results: { gap: spacing.sm + 2, marginTop: spacing.sm },
  more: { marginTop: spacing.lg },
});
