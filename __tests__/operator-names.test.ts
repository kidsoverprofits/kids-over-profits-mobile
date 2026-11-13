/**
 * A company's names under its title (aliasLines()), with and without a popular name (operator.popularName on the
 * website, inc/operator-pages.php): titled by it, the record's name is on a labelled line and never repeated bare.
 */
import type { OperatorPayload } from '@/api/types';
import { aliasLines } from '@/components/operator/model';

const op = (o: Partial<OperatorPayload>) => ({ name: '', full_name: '', current_name: '', aka: [], ...o }) as OperatorPayload;

describe('aliasLines', () => {
  it('shows a full name with its abbreviation, and the other names', () => {
    expect(aliasLines(op({ name: 'Universal Health Services', full_name: 'Universal Health Services (UHS)', aka: ['UHS'] })))
      .toEqual(['Universal Health Services (UHS)', 'Also known as UHS']);
  });

  it('titled by the name it uses now: the record name reads "Formerly", once', () => {
    expect(aliasLines(op({ name: 'CRC Health Group', full_name: 'CRC Health Corporation', formerly: ['CRC Health Corporation'] })))
      .toEqual(['Formerly CRC Health Corporation']);
  });

  it('titled by an other name: the record name is "Also known as", once', () => {
    expect(aliasLines(op({ name: 'Solacium', full_name: 'InnerChange', aka: ['InnerChange', 'Solacium Holdings'] })))
      .toEqual(['Also known as InnerChange', 'Also known as Solacium Holdings']);
  });

  it('titled by a past name: the record name is "Now known as", once', () => {
    expect(aliasLines(op({ name: 'Old Co', full_name: 'New Co', current_name: 'New Co' }))).toEqual(['Now known as New Co']);
  });

  it('an older payload with no formerly key still works', () => {
    expect(aliasLines(op({ name: 'A', full_name: 'A' }))).toEqual([]);
  });
});
