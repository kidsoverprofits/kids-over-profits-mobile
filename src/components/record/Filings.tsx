import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { BusinessEntity, NonprofitOrg } from '@/api/types';
import { colors } from '@/theme/colors';
import { radius, spacing, type } from '@/theme/typography';
import { MoreButton, SectionBlock, useOpenLink } from '../site';

const YEARS_SHOWN = 5;

/** "$1,234,567" as the website prints a 990 amount (kop_npf_money()); '' when the return does not give it. */
export function money(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '';
  const n = Math.trunc(v);
  const digits = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${n < 0 ? '-$' : '$'}${digits}`;
}

function Link({ label, url }: { label: string; url: string }) {
  const open = useOpenLink();
  return (
    <Text accessibilityRole="link" onPress={() => open(url)} style={styles.link}>
      {label}
    </Text>
  );
}

function Org({ o }: { o: NonprofitOrg }) {
  const [all, setAll] = useState(false);
  const rows = all ? o.filings : o.filings.slice(0, YEARS_SHOWN);
  const kind = o.kind ? `Filed with the IRS as ${o.kind.toLowerCase()}${o.since ? `, tax-exempt since ${o.since}` : ''}.` : o.since ? `Tax-exempt since ${o.since}.` : '';
  return (
    <View style={styles.org}>
      <Text style={styles.subhead}>{o.name}</Text>
      <Text style={styles.meta}>
        {`EIN ${o.ein_label}${o.place ? `, ${o.place}` : ''}. ${kind} `}
        {o.url ? <Link label="Every filing on ProPublica's Nonprofit Explorer" url={o.url} /> : null}
      </Text>
      {o.filings.length ? (
        <View style={styles.rows}>
          {rows.map((f) => (
            <View key={`${f.year}-${f.form}`} style={styles.year}>
              <Text style={styles.yearHead}>
                {String(f.year)}
                {'  '}
                {f.pdf ? <Link label={`Form ${f.form}`} url={f.pdf} /> : <Text style={styles.meta}>{`Form ${f.form}`}</Text>}
              </Text>
              {[
                ['Revenue', money(f.revenue)],
                ['Expenses', money(f.expenses)],
                ['Paid to officers and directors', money(f.officer_pay)],
                ['Assets at year end', money(f.assets)],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <Text key={k} style={styles.small}>
                    <Text style={styles.dt}>{`${k}: `}</Text>
                    {v}
                  </Text>
                ))}
            </View>
          ))}
          {o.filings.length > YEARS_SHOWN ? (
            <MoreButton count={o.filings.length - YEARS_SHOWN} expanded={all} onPress={() => setAll((a) => !a)} />
          ) : null}
        </View>
      ) : (
        <Text style={styles.small}>ProPublica has no returns on file for it.</Text>
      )}
    </View>
  );
}

/** Nonprofit tax filings (IRS Form 990), newest year first, as on the website's "Nonprofit tax filings". */
export function NonprofitsSection({ orgs, who, onLayoutY }: { orgs?: NonprofitOrg[]; who: 'program' | 'company'; onLayoutY?: (id: string, y: number) => void }) {
  if (!orgs?.length) return null;
  const s = orgs.length > 1 ? 's' : '';
  return (
    <SectionBlock id="tax-filings" title="Nonprofit tax filings" icon="landmark" onLayoutY={onLayoutY}>
      <Text style={styles.meta}>
        {who === 'program'
          ? `The yearly returns (IRS Form 990) of the nonprofit${s} this program operates under, from the IRS through ProPublica's Nonprofit Explorer.`
          : `The yearly returns (IRS Form 990) of the nonprofit${s} behind this company, from the IRS through ProPublica's Nonprofit Explorer.`}
      </Text>
      {orgs.map((o) => (
        <Org key={o.ein_label || o.name} o={o} />
      ))}
    </SectionBlock>
  );
}

function Entity({ e }: { e: BusinessEntity }) {
  const [all, setAll] = useState(false);
  const events = all ? e.events : e.events.slice(0, YEARS_SHOWN);
  return (
    <View style={styles.org}>
      <Text style={styles.subhead}>{e.name}</Text>
      <Text style={styles.meta}>
        {`${e.summary} `}
        {e.url ? <Link label={`${e.state}'s record of it`} url={e.url} /> : null}
      </Text>
      {e.address ? (
        <Text style={styles.small}>
          <Text style={styles.dt}>{'Principal address: '}</Text>
          {e.address}
        </Text>
      ) : null}
      {e.officers.length ? (
        <View>
          <Text style={styles.dt}>Officers on file</Text>
          {e.officers.map((o, i) => (
            <Text key={i} style={styles.small}>
              {`${o.name}${o.title ? `, ${o.title}` : ''}`}
              {o.where ? <Text style={styles.meta}>{` (${o.where})`}</Text> : null}
            </Text>
          ))}
          {e.more_officers ? <Text style={styles.meta}>{"More officers are listed on the state's record."}</Text> : null}
        </View>
      ) : null}
      {e.agent ? (
        <Text style={styles.small}>
          <Text style={styles.dt}>{'Registered agent: '}</Text>
          {e.agent.name}
          {e.agent.where ? <Text style={styles.meta}>{` (${e.agent.where})`}</Text> : null}
        </Text>
      ) : null}
      {e.events.length ? (
        <View style={styles.rows}>
          <Text style={styles.dt}>Filings since it was formed</Text>
          {events.map((ev, i) => (
            <Text key={i} style={styles.small}>
              {ev.date ? <Text style={styles.strong}>{`${ev.date}: `}</Text> : null}
              {ev.url ? <Link label={ev.what} url={ev.url} /> : ev.what}
              {ev.name ? `, as ${ev.name}` : ''}
              {ev.notes ? <Text style={styles.meta}>{` (${ev.notes})`}</Text> : null}
            </Text>
          ))}
          {e.events.length > YEARS_SHOWN ? (
            <MoreButton count={e.events.length - YEARS_SHOWN} expanded={all} onPress={() => setAll((a) => !a)} />
          ) : null}
        </View>
      ) : null}
      {e.trade_names.length ? (
        <View>
          <Text style={styles.dt}>Trade names it registered</Text>
          {e.trade_names.map((t, i) => (
            <Text key={i} style={styles.small}>
              {t.name}
              {t.note ? <Text style={styles.meta}>{` (${t.note})`}</Text> : null}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** State business filings of the companies behind a program or company, as on the website's "Business filings". */
export function BusinessesSection({ entities, who, onLayoutY }: { entities?: BusinessEntity[]; who: 'program' | 'company'; onLayoutY?: (id: string, y: number) => void }) {
  if (!entities?.length) return null;
  const many = entities.length > 1;
  return (
    <SectionBlock id="business-filings" title="Business filings" icon="landmark" onLayoutY={onLayoutY}>
      <Text style={styles.meta}>
        {who === 'program'
          ? `The compan${many ? 'ies' : 'y'} registered with the state behind this program, as the state's business register lists ${many ? 'them' : 'it'}.`
          : "This company's registrations with the states, as their business registers list them."}
      </Text>
      {entities.map((e) => (
        <Entity key={`${e.state}-${e.name}`} e={e} />
      ))}
    </SectionBlock>
  );
}

const styles = StyleSheet.create({
  org: { gap: spacing.xs, paddingTop: spacing.sm },
  subhead: { ...type.subheading },
  meta: { ...type.meta },
  small: { ...type.small },
  strong: { ...type.smallBold },
  dt: { ...type.label },
  rows: { gap: spacing.sm },
  year: { backgroundColor: colors.sand, borderRadius: radius.box, padding: 12, gap: 2 },
  yearHead: { ...type.smallBold },
  link: { color: colors.navy, textDecorationLine: 'underline' },
});
