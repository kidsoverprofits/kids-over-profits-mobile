import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAdminTools } from '@/api/admin';
import { HeaderDonateButton } from '@/components/Donate';
import { Icon, type IconName } from '@/components/Icon';
import { rememberedAdmin } from '@/lib/adminSession';
import { useCredentials } from '@/lib/credentials';
import { colors } from '@/theme/colors';

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color, size }: { color: ColorValue; size: number }) => <Icon name={icon} size={Math.min(size, 24)} color={color} />,
  tabBarAccessibilityLabel: `${title} tab`,
});

/** Room for a 24 pt icon over a 16 pt label, plus the phone's home-indicator inset. */
const TAB_BAR_HEIGHT = 70;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // The Admin tab appears only once the site has said the saved login is an administrator's (this time, or
  // any time before: the note keeps the tab there offline and while the tools list loads).
  const { creds } = useCredentials();
  const tools = useAdminTools(creds);
  const [known, setKnown] = useState('');
  useEffect(() => {
    let live = true;
    void rememberedAdmin().then((u) => live && setKnown(u));
    return () => {
      live = false;
    };
  }, [creds, tools.data, tools.error]);
  const admin = !!creds && (!!tools.data || known === creds.username);
  return (
    <Tabs
      screenOptions={{
        // The site footer's look: midnight with a 4 px teal rule under it.
        headerStyle: { backgroundColor: colors.midnight, borderBottomWidth: 4, borderBottomColor: colors.teal },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colors.midnight,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.cardBorder,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 6),
        },
        tabBarLabelStyle: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{ ...tab('Home', 'home'), headerRight: () => <HeaderDonateButton /> }} />
      <Tabs.Screen name="news" options={tab('News', 'newspaper')} />
      <Tabs.Screen name="map" options={{ ...tab('Map', 'shuffle'), title: 'Network map', tabBarLabel: 'Map' }} />
      <Tabs.Screen name="places" options={tab('Places', 'map-pin')} />
      <Tabs.Screen name="companies" options={tab('Companies', 'building')} />
      <Tabs.Screen name="send" options={tab('Send', 'send')} />
      <Tabs.Screen name="admin" options={{ ...tab('Admin', 'wrench'), href: admin ? undefined : null }} />
    </Tabs>
  );
}
