import { useRouter, type Href } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppSuggest, useOperators } from '@/api/queries';
import type { OperatorListItem } from '@/api/types';
import { CompanyTile, HubHeader } from '@/components/site';
import { SuggestionList, suggestionHref } from '@/components/Suggestions';
import { AlphabetBar } from '@/components/tabs/AlphabetBar';
import { Note } from '@/components/tabs/Note';
import { SearchField } from '@/components/tabs/SearchField';
import { useDebounced } from '@/components/tabs/useDebounced';
import { pageColumn } from '@/components/tabs/TabPage';
import { ErrorState, Loading } from '@/components/ui';
import { stateByCode } from '@/data/states';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/typography';
import { useRefreshControl } from '@/lib/refresh';

type Company = { key: string; slug: string; name: string; line: string; count: number; letter: string };

const letterOf = (name: string) => {
  const c = name.trim().charAt(0).toUpperCase();
  return c >= 'A' && c <= 'Z' ? c : '#';
};

/** Where a company's programs are ("Arizona, Utah", "5 places"), else its years ("Founded 2005"). */
export function describe(c: Pick<OperatorListItem, 'places' | 'years'>): string {
  const places = c.places.map((p) => stateByCode(p)?.name ?? p);
  if (places.length && places.length <= 2) return places.join(', ');
  if (places.length) return places.every((p, i) => stateByCode(c.places[i])) ? `${places.length} states` : `${places.length} places`;
  return c.years;
}

export default function CompaniesScreen() {
  const router = useRouter();
  const list = useRef<FlatList<Company | null>>(null);
  const [filter, setFilter] = useState('');
  const index = useOperators();
  const refreshControl = useRefreshControl(index.refetch);
  // The list filters by the name shown; the server also finds companies by a past or other name.
  const typed = useDebounced(filter, 250);
  const byOtherName = useAppSuggest(typed, ['operator'], 6);

  const companies = useMemo<Company[]>(
    () =>
      (index.data?.items ?? [])
        .map((c) => ({ key: String(c.id), slug: c.slug, name: c.name, line: describe(c), count: c.programs, letter: letterOf(c.name) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [index.data],
  );

  const shown = companies.filter((c) => c.name.toLowerCase().includes(filter.trim().toLowerCase()));
  // Two columns: an odd last company gets an empty cell so its tile keeps the column width.
  const cells: (Company | null)[] = shown.length % 2 ? [...shown, null] : shown;
  const letters = [...new Set(shown.map((c) => c.letter))];
  const total = companies.length;
  const listed = new Set(shown.map((c) => c.slug));
  const extra = filter.trim() ? (byOtherName.data?.items ?? []).filter((i) => i.slug && !listed.has(i.slug)) : [];
  const count = `${shown.length === total ? '' : `${shown.length} of `}${total} ${total === 1 ? 'company' : 'companies'}`;

  const jump = (letter: string) => {
    const at = shown.findIndex((c) => c.letter === letter);
    if (at >= 0) list.current?.scrollToIndex({ index: Math.floor(at / 2), animated: true });
  };

  const header = (
    <View style={styles.header}>
      <HubHeader
        eyebrow="Directory"
        title="Parent companies"
        standfirst="The companies that own and run troubled teen programs."
        counts={total ? [count] : []}
      />
      <SearchField value={filter} onChangeText={setFilter} placeholder="Filter companies, or an old name" label="Filter the list of companies, including former names" />
      {extra.length ? (
        <View style={styles.extra}>
          <Note>Also matching, by another name</Note>
          <SuggestionList
            items={extra}
            onPick={(item) => {
              const href = suggestionHref(item);
              if (href) router.push(href);
            }}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <AlphabetBar letters={letters} onPick={jump} />
      {index.isLoading ? (
        <Loading label="Loading companies" />
      ) : index.isError ? (
        <ErrorState message={(index.error as Error).message} onRetry={() => index.refetch()} />
      ) : (
        <FlatList
          ref={list}
          refreshControl={refreshControl}
          data={cells}
          numColumns={2}
          keyExtractor={(c, i) => c?.key ?? `empty-${i}`}
          columnWrapperStyle={styles.columns}
          ItemSeparatorComponent={Gap}
          ListHeaderComponent={header}
          ListEmptyComponent={extra.length ? null : <Note>No company matches.</Note>}
          keyboardShouldPersistTaps="handled"
          onScrollToIndexFailed={(info) => {
            list.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
            setTimeout(() => list.current?.scrollToIndex({ index: info.index, animated: true }), 300);
          }}
          renderItem={({ item }) => (
            <View style={styles.cell}>
              {item ? (
                <CompanyTile
                  style={styles.tile}
                  name={item.name}
                  line={item.line}
                  programs={item.count}
                  onPress={() => router.push(`/operator/${encodeURIComponent(item.slug)}` as Href)}
                />
              ) : null}
            </View>
          )}
          contentContainerStyle={pageColumn}
        />
      )}
    </SafeAreaView>
  );
}

const Gap = () => <View style={styles.gap} />;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  header: { marginBottom: spacing.md },
  extra: { marginTop: spacing.md, gap: spacing.xs },
  columns: { gap: spacing.md - 4 },
  cell: { flex: 1, minWidth: 0 },
  tile: { flex: 1 },
  gap: { height: spacing.md - 4 },
});
