import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { StyleSheet, Text, View } from 'react-native';

import { SITE } from '@/api/client';
import { DonateBox } from '@/components/Donate';
import { Button, HubHeader, HubListRow, NoticeBox } from '@/components/site';
import { DISCLAIMER_PARAGRAPHS } from '@/components/tabs/disclaimerText';
import { TabPage } from '@/components/tabs/TabPage';
import { spacing, type } from '@/theme/typography';

const open = (path: string) => () => openBrowserAsync(`${SITE}${path}`);

const LINKS = [
  { title: 'Open data', meta: 'Download the records this app reads.', path: '/open-data/' },
  { title: 'Glossary', meta: 'Words the industry uses and what they mean.', path: '/glossary/' },
  { title: 'Privacy', meta: 'What the website keeps.', path: '/privacy-policy/' },
];

export default function AboutScreen() {
  const router = useRouter();
  const version = Constants.expoConfig?.version;
  return (
    <TabPage>
      <HubHeader eyebrow="About" title="Kids Over Profits" />
      <Text style={type.body}>
        Kids Over Profits tracks the troubled teen industry: the programs, the companies behind them, the deaths and findings on record, the lawsuits and the news.
      </Text>

      <View style={styles.block}>
        <HubListRow
          title="Resources"
          meta="Crisis lines, survivor support, advocacy and further reading."
          onPress={() => router.push('/resources')}
        />
        <NoticeBox variant="reporting" title="Report abuse">
          <Text style={type.body}>Where to report an abusive program or therapist, state by state.</Text>
          <Button label="Find where to report" icon="external" onPress={open('/report-abuse/')} style={styles.button} />
        </NoticeBox>

        <Text accessibilityRole="header" style={type.subheading}>Share information</Text>
        <Text style={type.body}>Add or correct a facility, news story, lawsuit or survivor account.</Text>
        <Button variant="secondary" label="Open the form" icon="external" onPress={open('/tti-data-submission/')} style={styles.button} />

        <Text accessibilityRole="header" style={type.subheading}>For volunteers</Text>
        <HubListRow
          title="Volunteer sign-in"
          meta="Links you send go straight to the review queues. Everyone else can send without an account."
          onPress={() => router.push('/reviewer')}
        />
      </View>

      <DonateBox />

      <Text accessibilityRole="header" style={type.heading}>Before you rely on a record</Text>
      <View style={styles.paragraphs}>
        {DISCLAIMER_PARAGRAPHS.map((p, i) => (
          <Text key={i} style={type.body}>{p}</Text>
        ))}
      </View>

      <Text accessibilityRole="header" style={type.heading}>Data and privacy</Text>
      <View style={styles.paragraphs}>
        <Text style={type.body}>
          The data is licensed Creative Commons Attribution-ShareAlike 4.0. Credit Kids Over Profits (kidsoverprofits.org) and share what you build from it under the same license.
        </Text>
        <Text style={type.body}>
          This app has no accounts and no analytics. It asks kidsoverprofits.org for the pages you open, and sends what you choose to send on the Send tab. When you send a link, it also opens that page to read its title and date.
        </Text>
      </View>

      <Text accessibilityRole="header" style={type.heading}>On the website</Text>
      <View style={styles.paragraphs}>
        {LINKS.map((l) => (
          <HubListRow key={l.path} title={l.title} meta={l.meta} onPress={open(l.path)} />
        ))}
      </View>

      {version ? <Text style={[type.meta, styles.version]}>{`Version ${version}`}</Text> : null}
    </TabPage>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.lg, marginBottom: spacing.xl, gap: spacing.sm },
  button: { alignSelf: 'flex-start', marginTop: spacing.xs },
  paragraphs: { gap: spacing.sm + 4, marginTop: spacing.sm, marginBottom: spacing.lg },
  version: { marginTop: spacing.sm },
});
