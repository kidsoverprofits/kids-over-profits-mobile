import { fireEvent, render, screen } from '@testing-library/react-native';

import SendScreen from '@/app/(tabs)/send';
import ReviewerScreen from '@/app/reviewer';

const mockParams: { current: Record<string, string> } = { current: {} };
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams.current,
  useFocusEffect: jest.fn(),
}));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.2.3' } } }));
jest.mock('expo-clipboard', () => ({ getStringAsync: jest.fn().mockResolvedValue('') }));
jest.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: undefined }) }));
jest.mock('@/api/queries', () => ({ useSuggest: () => ({ data: { items: [] } }), useAppSuggest: () => ({ data: { items: [] } }) }));
jest.mock('@/lib/credentials', () => ({
  useCredentials: () => ({ creds: null, ready: true, reload: jest.fn() }),
  saveCredentials: jest.fn(),
  clearCredentials: jest.fn(),
}));
jest.mock('@/lib/pageMeta', () => ({ fetchPageMeta: jest.fn().mockResolvedValue(null) }));

beforeEach(() => {
  mockParams.current = {};
});

describe('Send tab', () => {
  it('opens on Send a link with the review notice and the link box', async () => {
    await render(<SendScreen />);
    expect(screen.getByText('Send to Kids Over Profits')).toBeTruthy();
    expect(screen.getByText(/reviewed by a person before it appears on the site/)).toBeTruthy();
    expect(screen.getByLabelText('Link, required')).toBeTruthy();
    expect(screen.getByLabelText('Send an article')).toBeTruthy();
  });

  it('asks for a full web address before sending a link', async () => {
    await render(<SendScreen />);
    await fireEvent.press(screen.getByLabelText('Send an article'));
    expect(await screen.findByText('Enter the full web address, starting with https://.')).toBeTruthy();
  });

  it('switches to Add a facility', async () => {
    await render(<SendScreen />);
    await fireEvent.press(screen.getByLabelText('Add a facility'));
    expect(screen.getByLabelText('Facility name, required')).toBeTruthy();
    expect(screen.queryByLabelText('Link, required')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Send a facility'));
    expect(await screen.findByText('Enter the facility name.')).toBeTruthy();
  });

  it('opens Correct a facility prefilled from the facility page', async () => {
    mockParams.current = { mode: 'correction', facility_id: '9607', facility: 'Falcon Ridge Ranch', ts: '1' };
    await render(<SendScreen />);
    expect(screen.getByText('Falcon Ridge Ranch')).toBeTruthy();
    expect(screen.getByLabelText('Change facility, now Falcon Ridge Ranch')).toBeTruthy();
    expect(screen.getByLabelText('What is wrong, or what should be added, required')).toBeTruthy();
    expect(screen.getByLabelText('Send a correction')).toBeTruthy();
  });
});

describe('Volunteer sign-in', () => {
  it('shows the fields and the sign-in button', async () => {
    await render(<ReviewerScreen />);
    expect(screen.getByRole('header', { name: 'Volunteer sign-in' })).toBeTruthy();
    expect(screen.getByLabelText('WordPress username')).toBeTruthy();
    expect(screen.getByLabelText('Application password')).toBeTruthy();
    expect(screen.getByLabelText('Sign in')).toBeTruthy();
  });
});
