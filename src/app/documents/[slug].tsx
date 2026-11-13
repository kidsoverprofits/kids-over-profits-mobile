import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useDocuments } from '@/api/queries';
import type { DocFile, DocFolder, DocumentsPayload } from '@/api/types';
import { Icon } from '@/components/Icon';
import { HubListRow, SectionBlock } from '@/components/site';
import { dense } from '@/components/site/metrics';
import { AppText, ErrorState, Loading, Screen } from '@/components/ui';
import { sizeLabel } from '@/lib/docs';
import { docHref } from '@/lib/links';
import { colors } from '@/theme/colors';
import { radius, spacing, touchTarget, type } from '@/theme/typography';

const THUMB_W = 56;
const THUMB_H = 72;

/** One document: its first page (or the file type), the title, "PDF, 1.2 MB". Opens in the app's viewer. */
function FileRow({ file }: { file: DocFile }) {
  const router = useRouter();
  const [broken, setBroken] = useState(false);
  const ext = (file.ext || '').toUpperCase();
  const meta = [ext, sizeLabel(file.size)].filter(Boolean).join(', ');
  return (
    <Pressable
      onPress={() => router.push(docHref(file.url, file.title))}
      accessibilityRole="link"
      accessibilityLabel={[file.title, meta].filter(Boolean).join('. ')}
      style={({ pressed }) => [styles.file, pressed && styles.pressed]}>
      <View style={styles.thumb}>
        {file.thumb && !broken ? (
          <Image source={{ uri: file.thumb }} style={styles.thumbImage} contentFit="cover" onError={() => setBroken(true)} accessible={false} />
        ) : (
          <Text {...dense} style={styles.ext}>{ext || 'FILE'}</Text>
        )}
      </View>
      <View style={styles.fileText}>
        <Text style={styles.title}>{file.title}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
    </Pressable>
  );
}

/** A subfolder, closed until tapped; folders inside it nest the same way. */
function Folder({ folder, open: startOpen = false }: { folder: DocFolder; open?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <View style={styles.folder}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${folder.name}, ${folder.count} ${folder.count === 1 ? 'document' : 'documents'}`}
        style={({ pressed }) => [styles.folderHead, pressed && styles.pressed]}>
        <Icon name="folder" size={20} color={colors.tealInk} />
        <Text style={styles.folderName}>{folder.name}</Text>
        <Text {...dense} style={styles.count}>{folder.count}</Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.navy} />
      </Pressable>
      {open ? (
        <View style={styles.folderBody}>
          {folder.folders.map((f, i) => <Folder key={`${f.name}-${i}`} folder={f} />)}
          {folder.files.map((f) => <FileRow key={f.id} file={f} />)}
        </View>
      ) : null}
    </View>
  );
}

function Library({ d, refetch }: { d: DocumentsPayload; refetch: () => Promise<unknown> }) {
  const router = useRouter();
  // A library that is one folder and nothing else opens with that folder open.
  const single = d.files.length === 0 && d.folders.length === 1;
  return (
    <Screen refetch={refetch}>
      <AppText variant="eyebrow">Documents on file</AppText>
      <AppText variant="title" style={styles.heading}>{d.name}</AppText>
      <AppText variant="small" muted style={styles.lede}>
        {d.total ? `${d.total} ${d.total === 1 ? 'document' : 'documents'}` : 'No documents filed here yet.'}
      </AppText>
      {d.folders.map((f, i) => <Folder key={`${f.name}-${i}`} folder={f} open={single} />)}
      {d.files.map((f) => <FileRow key={f.id} file={f} />)}
      {d.programs.length ? (
        <SectionBlock id="programs" title="Documents filed under its programs" icon="folder">
          {d.programs.map((p) => (
            <HubListRow
              key={p.slug}
              title={p.name}
              meta={`${p.count} ${p.count === 1 ? 'document' : 'documents'}`}
              onPress={() => router.push({ pathname: '/documents/[slug]', params: { slug: p.slug, kind: 'facility' } } as Href)}
            />
          ))}
        </SectionBlock>
      ) : null}
    </Screen>
  );
}

/** A facility's or a company's document library, listed in the app (kop/v1/<kind>/<slug>/documents). */
export default function DocumentsScreen() {
  const { slug, kind } = useLocalSearchParams<{ slug: string; kind?: string }>();
  const k = kind === 'operator' ? 'operator' : 'facility';
  const query = useDocuments(k, slug);
  return (
    <>
      <Stack.Screen options={{ title: 'Documents' }} />
      {query.isLoading ? (
        <Loading label="Loading documents" />
      ) : query.isError ? (
        <ErrorState message={(query.error as Error).message} onRetry={() => query.refetch()} />
      ) : query.data ? (
        <Library d={query.data} refetch={query.refetch} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: spacing.xs },
  lede: { marginTop: spacing.xs, marginBottom: spacing.md },
  pressed: { opacity: 0.7 },
  file: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: touchTarget,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  thumb: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: radius.thumb,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%' },
  ext: { ...type.pill, color: colors.midnight },
  fileText: { flex: 1, gap: spacing.xxs },
  title: { ...type.cardTitle },
  meta: { ...type.meta },
  folder: { marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.box, backgroundColor: colors.white },
  folderHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, minHeight: touchTarget + 4 },
  folderName: { ...type.smallBold, flex: 1 },
  count: { ...type.meta },
  folderBody: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
});
