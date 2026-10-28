import {
  applyLawsuitFields,
  applyNewsFields,
  buildLawsuitSubmitBody,
  buildNewsSubmitBody,
  emptyLawsuitDraft,
  emptyNewsDraft,
  fetchLawsuitForm,
  mergeLines,
  processArticle,
  processLawsuit,
  lawsuitReadNote,
  processorErrorMessage,
  readLawsuitFields,
  readNewsFields,
  submitProcessed,
} from '@/api/processor';

const creds = { username: 'dani', appPassword: 'abcd efgh' };

function fakeFetch(status: number, body: unknown) {
  return jest.fn(async () => ({ status, ok: status >= 200 && status < 300, json: async () => body })) as unknown as jest.Mock & typeof fetch;
}

describe('field mapping', () => {
  it('reads the AI answer defensively', () => {
    const f = readNewsFields({ title: ' T ', tags: ['a', '', {}], details: { closure_date: '2020', empty: '' }, content_warnings: ['Abuse'] });
    expect(f.title).toBe('T');
    expect(f.tags).toEqual(['a']);
    expect(f.details).toEqual({ closure_date: '2020' });
    expect(readLawsuitFields({}).plaintiffs).toEqual([]);
  });

  it('fills empty fields, merges lists and never overwrites typed text', () => {
    const d = { ...emptyNewsDraft('https://x.org/a'), title: 'Mine', facilities: 'Alpha', tags: 'one' };
    const f = readNewsFields({
      title: 'AI title', author: 'Jo', published: '2024-05-06', facilities: ['alpha', 'Beta'], tags: ['One', 'two'],
      content_warnings: ['Abuse'], article_type: 'lawsuit', details: { court: 'X' },
    });
    const out = applyNewsFields({ ...d, details: { court: '' } }, f, [{ value: 'lawsuit', label: 'Lawsuit' }]);
    expect(out.title).toBe('Mine');
    expect(out.author).toBe('Jo');
    expect(out.published).toBe('2024-05-06');
    expect(out.facilities).toBe('Alpha\nBeta');
    expect(out.tags).toBe('one, two');
    expect(out.warnings).toEqual(['Abuse']);
    expect(out.article_type).toBe('lawsuit');
    expect(out.details).toEqual({ court: 'X' });
  });

  it('ignores a bad date and an article type the site does not list', () => {
    const out = applyNewsFields(emptyNewsDraft(), readNewsFields({ published: 'May 2024', article_type: 'other' }), [{ value: 'news', label: 'News' }]);
    expect(out.published).toBe('');
    expect(out.article_type).toBe('');
  });

  it('maps lawsuit fields and drops an unknown status', () => {
    const f = readLawsuitFields({ case_name: 'A v. B', status: 'weird', defendants: ['B'], claims: ['Neglect'] });
    const out = applyLawsuitFields(emptyLawsuitDraft('https://c.org'), f, [{ value: 'pending', label: 'Pending' }]);
    expect(out.case_name).toBe('A v. B');
    expect(out.status).toBe('');
    expect(out.defendants).toBe('B');
    expect(mergeLines('a\n\n b ', ['B', 'c'])).toBe('a\nb\nc');
  });
});

describe('submit bodies', () => {
  it('builds the extension article body', () => {
    const d = {
      ...emptyNewsDraft(' https://x.org/a '), title: ' T ', article_type: 'arrest', facilities: 'A\n\nB', tags: 'x, y,',
      warnings: ['Abuse'], details: { charges: ' theft ', stale: 'no' }, archive_url: 'https://web.archive.org/web/1/x', notes: '',
    };
    const body = buildNewsSubmitBody(d, { details: { arrest: { charges: 'Charges' } } }, true);
    expect(body).toMatchObject({
      type: 'article', full: 1, publish: 1, url: 'https://x.org/a', title: 'T', facilities: ['A', 'B'], tags: ['x', 'y'],
      content_warnings: ['Abuse'], details: { charges: 'theft' }, archive_url: 'https://web.archive.org/web/1/x', article_type: 'arrest',
    });
    expect(body).not.toHaveProperty('notes');
    expect(buildNewsSubmitBody(d, null, false).publish).toBe(0);
  });

  it('builds the lawsuit body', () => {
    const d = { ...emptyLawsuitDraft('https://c.org/1'), case_name: 'A v. B', plaintiffs: 'A', claims: 'x\ny', tags: 't1, t2' };
    expect(buildLawsuitSubmitBody(d, false)).toMatchObject({
      type: 'lawsuit', full: 1, publish: 0, url: 'https://c.org/1', title: 'A v. B', case_name: 'A v. B',
      plaintiffs: ['A'], defendants: [], claims: ['x', 'y'], tags: ['t1', 't2'], document_urls: [],
    });
    expect(buildLawsuitSubmitBody(emptyLawsuitDraft('https://c.org/2'), false).title).toBe('https://c.org/2');
    expect(buildLawsuitSubmitBody(d, false).source_urls).toEqual([]);
    const withDocket = { ...d, docket_url: 'https://www.courtlistener.com/docket/1/a-v-b/' };
    expect(buildLawsuitSubmitBody(withDocket, false).source_urls).toEqual(['https://www.courtlistener.com/docket/1/a-v-b/']);
    expect(buildLawsuitSubmitBody({ ...withDocket, url: withDocket.docket_url }, false).source_urls).toEqual([]);
  });
});

describe('requests', () => {
  it('reads the CourtListener docket the site matched', async () => {
    const out = await processLawsuit(creds, { url: 'https://x.org', text: '', instructions: '' },
      fakeFetch(200, { fields: { case_name: 'A v. B', plaintiffs: ['A'] }, courtlistener: { url: 'https://www.courtlistener.com/docket/1/a-v-b/', by: 'case_number' } }));
    expect(out.fields.case_name).toBe('A v. B');
    expect(out.docket).toEqual({ url: 'https://www.courtlistener.com/docket/1/a-v-b/', by: 'case_number' });
    expect(lawsuitReadNote(out.docket)).toMatch(/CourtListener docket for this case number/);
    const plain = await processLawsuit(creds, { url: 'https://x.org', text: '', instructions: '' }, fakeFetch(200, { fields: { case_name: 'C v. D' } }));
    expect(plain.docket).toBeNull();
    expect(lawsuitReadNote(plain.docket)).toBe('Filled in. Check each field before saving.');
  });

  it('says plainly when the site has no lawsuit routes', async () => {
    await expect(fetchLawsuitForm(creds, fakeFetch(404, { code: 'rest_no_route' }))).rejects.toThrow(/does not have the Lawsuit Processor yet/);
    expect(processorErrorMessage('news', 404, {})).toMatch(/News Processor/);
    expect(processorErrorMessage('news', 422, { message: 'Could not read it.' })).toBe('Could not read it.');
    expect(processorErrorMessage('news', 401, {})).toMatch(/rejected the login/);
  });

  it('posts the read with Basic auth and maps the fields', async () => {
    const f = fakeFetch(200, { fields: { title: 'Hi', tags: ['t'] } });
    const out = await processArticle(creds, { url: 'https://x.org', text: '', instructions: '' }, f);
    expect(out.title).toBe('Hi');
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/extension\/process$/);
    expect((init.headers as Record<string, string>).Authorization).toMatch(/^Basic /);
    expect(JSON.parse(init.body as string)).toEqual({ url: 'https://x.org', text: '', instructions: '' });
  });

  it('reports published, queue and duplicates', async () => {
    expect(await submitProcessed('news', {}, creds, fakeFetch(200, { published: true, queue: 'News' }))).toEqual({ kind: 'ok', published: true, queue: 'News' });
    expect(await submitProcessed('news', {}, creds, fakeFetch(200, {}))).toEqual({ kind: 'ok', published: false, queue: 'the review queue' });
    const dup = await submitProcessed('lawsuit', {}, creds, fakeFetch(409, { code: 'kop_duplicate', duplicates: [{ type: 'lawsuit', status: 'In review' }] }));
    expect(dup).toMatchObject({ kind: 'duplicate' });
    expect(await submitProcessed('lawsuit', {}, creds, fakeFetch(404, {}))).toMatchObject({ kind: 'error', message: expect.stringMatching(/Lawsuit Processor/) });
  });
});
